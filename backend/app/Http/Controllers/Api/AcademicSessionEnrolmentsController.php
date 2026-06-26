<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CourseEnrolment;
use App\Models\Invoice;
use App\Models\SystemConfiguration;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class AcademicSessionEnrolmentsController extends Controller
{
    use PaginationMeta;
    public function __construct(
        protected BillingService $billingService,
    ) {}
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('enrolments.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $sessionId = (string) $request->string('academic_session_id', '');
        $status = (string) $request->string('status', 'all');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'enrolled_at' => 'enrolled_at',
            'status' => 'status',
            'created_at' => 'created_at',
        ];

        $enrolments = AcademicSessionEnrolment::query()
            ->with(['student', 'academicSession'])
            ->when($search !== '', function ($query) use ($search) {
                $query->whereHas('student', function ($sq) use ($search) {
                    $sq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('admission_number', 'like', "%{$search}%");
                });
            })
            ->when($sessionId !== '', fn ($q) => $q->where('academic_session_id', $sessionId))
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderBy($sortableColumns[$sortBy] ?? 'enrolled_at', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $enrolments->getCollection()->map(fn (AcademicSessionEnrolment $e) => $this->transform($e))->values(),
            'meta' => $this->paginationMeta($enrolments, [
                'q' => $search,
                'academic_session_id' => $sessionId,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function myEnrolments(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        if (!$student) {
            return response()->json([ 'status_code' => 200, 'data' => []], 200);
        }

        $enrolments = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->with('academicSession')
            ->latest()
            ->get()
            ->map(fn (AcademicSessionEnrolment $e) => $this->transform($e))
            ->values();

        return response()->json([
            'data' => $enrolments,
        ]);
    }

    public function availableSessions(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        if (!$student) {
            return response()->json([ 'status_code' => 200, 'data' => []], 200);
        }

        $alreadyEnrolledSessionIds = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->pluck('academic_session_id');

        $sessions = AcademicSession::query()
            ->where('is_active', true)
            ->whereNotIn('id', $alreadyEnrolledSessionIds)
            ->with('year')
            ->latest('start_date')
            ->get()
            ->map(fn ($session) => [
                'id' => $session->id,
                'code' => $session->code,
                'name' => $session->name,
                'academic_year' => $session->year?->name,
                'start_date' => $session->start_date?->format('Y-m-d'),
                'end_date' => $session->end_date?->format('Y-m-d'),
            ]);

        return response()->json([
            'data' => $sessions,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json([ 'status_code' => 404, 'message' => 'Student profile not found.'], 404);
        }

        $validated = $request->validate([
            'academic_session_id' => [
                'required',
                'uuid',
                Rule::exists('academic_sessions', 'id')->where(fn ($q) => $q->where('is_active', true)),
            ],
        ]);

        $alreadyEnrolled = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->where('academic_session_id', $validated['academic_session_id'])
            ->with('academicSession')
            ->first();

        if ($alreadyEnrolled) {
            $invoice = $this->billingService->createInvoiceForStudent($student, $user->id, $alreadyEnrolled->academicSession);

            return response()->json([
                'status_code' => 200,
                'message' => 'Already enrolled in this session.',
                'data' => $this->transform($alreadyEnrolled),
                'invoice' => $this->transformInvoice($invoice),
            ]);
        }

        $priorCount = AcademicSessionEnrolment::where('student_id', $student->id)->count();
        $module = $priorCount + 1;
        $sessionsPerYear = (int) SystemConfiguration::getValue('sessions_per_full_year', 3);
        $yearOfStudy = (int) floor(($module - 1) / $sessionsPerYear) + 1;
        $sessionNumber = (($module - 1) % $sessionsPerYear) + 1;

        $session = AcademicSession::find($validated['academic_session_id']);

        [$enrolment, $invoice] = DB::transaction(function () use ($student, $validated, $yearOfStudy, $sessionNumber, $module, $user, $session) {
            $enrolment = AcademicSessionEnrolment::create([
                'student_id' => $student->id,
                'academic_session_id' => $validated['academic_session_id'],
                'year_of_study' => $yearOfStudy,
                'session_number' => $sessionNumber,
                'module' => $module,
                'status' => 'enrolled',
                'enrolled_at' => now(),
                'created_by' => $user->id,
                'updated_by' => $user->id,
            ]);

            $enrolment->load('academicSession');
            $invoice = $this->billingService->createInvoiceForStudent($student, $user->id, $session);

            return [$enrolment, $invoice];
        });

        return response()->json([
            'status_code' => 201,
            'message' => 'Enrolled in session successfully.',
            'data' => $this->transform($enrolment),
            'invoice' => $this->transformInvoice($invoice),
        ], 201);
    }

    public function registerCurrentSession(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json([ 'status_code' => 404, 'message' => 'Student profile not found.'], 404);
        }

        $activeSession = AcademicSession::query()
            ->where('is_active', true)
            ->latest('start_date')
            ->first();

        if (!$activeSession) {
            return response()->json([ 'status_code' => 404, 'message' => 'No active academic session available.'], 404);
        }

        $alreadyEnrolled = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->where('academic_session_id', $activeSession->id)
            ->with('academicSession')
            ->first();

        if ($alreadyEnrolled) {
            $invoice = $this->billingService->createInvoiceForStudent($student, $user->id, $activeSession);

            return response()->json([
                'status_code' => 200,
                'message' => 'You are already enrolled in the current session.',
                'data' => $this->transform($alreadyEnrolled),
                'invoice' => $this->transformInvoice($invoice),
            ]);
        }

        $priorCount = AcademicSessionEnrolment::where('student_id', $student->id)->count();
        $module = $priorCount + 1;
        $sessionsPerYear = (int) SystemConfiguration::getValue('sessions_per_full_year', 3);
        $yearOfStudy = (int) floor(($module - 1) / $sessionsPerYear) + 1;
        $sessionNumber = (($module - 1) % $sessionsPerYear) + 1;

        [$enrolment, $invoice] = DB::transaction(function () use ($student, $activeSession, $yearOfStudy, $sessionNumber, $module, $user) {
            $enrolment = AcademicSessionEnrolment::create([
                'student_id' => $student->id,
                'academic_session_id' => $activeSession->id,
                'year_of_study' => $yearOfStudy,
                'session_number' => $sessionNumber,
                'module' => $module,
                'status' => 'enrolled',
                'enrolled_at' => now(),
                'created_by' => $user->id,
                'updated_by' => $user->id,
            ]);

            $enrolment->load('academicSession');
            $invoice = $this->billingService->createInvoiceForStudent($student, $user->id, $activeSession);

            return [$enrolment, $invoice];
        });

        return response()->json([
            'status_code' => 201,
            'message' => 'Session registered successfully.',
            'data' => $this->transform($enrolment),
            'invoice' => $this->transformInvoice($invoice),
        ], 201);
    }

    public function registerUnits(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json([ 'status_code' => 404, 'message' => 'Student profile not found.'], 404);
        }

        $validated = $request->validate([
            'academic_session_enrolment_id' => 'required|string|exists:academic_session_enrolments,id',
            'unit_ids' => 'required|array|min:1',
            'unit_ids.*' => 'required|string|exists:units,id',
        ]);

        $sessionEnrolment = AcademicSessionEnrolment::query()
            ->where('id', $validated['academic_session_enrolment_id'])
            ->where('student_id', $student->id)
            ->with('academicSession')
            ->first();

        if (!$sessionEnrolment) {
            return response()->json([ 'status_code' => 404, 'message' => 'Session enrolment not found for this student.'], 404);
        }

        if (!$sessionEnrolment->academicSession?->is_active) {
            return response()->json([ 'status_code' => 422, 'message' => 'You can only register units for an active academic session.'], 422);
        }
        $courseCurriculumId = $student->course_curriculum_id
            ?? CourseEnrolment::query()
                ->where('student_id', $student->id)
                ->where('status', 'enrolled')
                ->latest()
                ->value('course_curriculum_id');

        if (!$courseCurriculumId) {
            return response()->json(['status_code' => 422, 'message' => 'No course curriculum assigned to this student.'], 422);
        }

        $allowedUnitIds = Unit::query()
            ->where('course_curriculum_id', $courseCurriculumId)
            ->where('is_active', true)
            ->where(function ($query) use ($sessionEnrolment) {
                $query->where('modules_taught', $sessionEnrolment->module)
                    ->orWhereNull('modules_taught');
            })
            ->pluck('id');

        $requestedUnitIds = collect($validated['unit_ids'])->unique()->values();
        $invalidUnitIds = $requestedUnitIds->diff($allowedUnitIds);

        if ($invalidUnitIds->isNotEmpty()) {
            return response()->json([
                'status_code' => 422,
                'message' => 'One or more selected units do not belong to your current course, curriculum, and module.',
                'invalid_unit_ids' => $invalidUnitIds->values(),
            ], 422);
        }

        $created = 0;
        foreach ($requestedUnitIds as $unitId) {
            $registration = StudentUnitRegistration::firstOrCreate(
                [
                    'academic_session_id' => $sessionEnrolment->academic_session_id,
                    'student_id' => $student->id,
                    'unit_id' => $unitId,
                ],
                [
                    'academic_session_enrolment_id' => $sessionEnrolment->id,
                ],
            );

            if ($registration->wasRecentlyCreated) {
                $created++;
            }
        }

        return response()->json([
            'status_code' => 200,
            'message' => $created > 0
                ? "{$created} unit(s) registered successfully."
                : 'Selected unit(s) were already registered.',
            'registered_count' => $requestedUnitIds->count(),
            'created_count' => $created,
        ]);
    }

    public function show(Request $request, AcademicSessionEnrolment $academic_session_enrolment): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->can('enrolments.view');
        $isOwner = $user->student?->id === $academic_session_enrolment->student_id;

        if (!$isAdmin && !$isOwner) {
            abort(403);
        }

        $academic_session_enrolment->load(['student', 'academicSession']);

        return response()->json([
            'data' => $this->transform($academic_session_enrolment),
        ]);
    }

    private function transform(AcademicSessionEnrolment $enrolment): array
    {
        return [
            'id' => $enrolment->id,
            'student_id' => $enrolment->student_id,
            'student_name' => $enrolment->student?->full_name ?? trim(collect([$enrolment->student?->first_name, $enrolment->student?->middle_name, $enrolment->student?->last_name])->filter()->implode(' ')),
            'admission_number' => $enrolment->student?->admission_number,
            'academic_session_id' => $enrolment->academic_session_id,
            'academic_session_name' => $enrolment->academicSession?->name,
            'academic_session_code' => $enrolment->academicSession?->code,
            'year_of_study' => $enrolment->year_of_study,
            'session_number' => $enrolment->session_number,
            'module' => $enrolment->module,
            'status' => $enrolment->status,
            'enrolled_at' => $enrolment->enrolled_at,
            'created_at' => $enrolment->created_at,
        ];
    }

    private function transformInvoice(Invoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'invoice_type' => $invoice->invoice_type,
            'status' => $invoice->status,
            'amount_due' => (float) $invoice->amount_due,
            'paid_amount' => (float) $invoice->paid_amount,
            'balance_due' => (float) $invoice->balance_due,
            'due_date' => $invoice->due_date?->format('Y-m-d'),
        ];
    }

}

