<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CourseEnrolment;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AcademicSessionEnrolmentsController extends Controller
{
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
            return response()->json(['data' => []]);
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
            return response()->json(['data' => []]);
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
            return response()->json(['message' => 'Student profile not found.'], 404);
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
            ->exists();

        if ($alreadyEnrolled) {
            return response()->json(['message' => 'Already enrolled in this session.'], 409);
        }

        $courseEnrolment = CourseEnrolment::query()
            ->where('student_id', $student->id)
            ->latest()
            ->first();

        $enrolment = AcademicSessionEnrolment::create([
            'student_id' => $student->id,
            'academic_session_id' => $validated['academic_session_id'],
            'course_enrolment_id' => $courseEnrolment?->id,
            'status' => 'enrolled',
            'enrolled_at' => now(),
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $session = AcademicSession::find($validated['academic_session_id']);

        $enrolment->load('academicSession');

        try {
            $this->billingService->createInvoiceForStudent($student, $user->id, $session);
        } catch (\Exception $e) {
            // invoice generation is non-blocking
        }

        return response()->json([
            'message' => 'Enrolled in session successfully.',
            'data' => $this->transform($enrolment),
        ], 201);
    }

    public function registerCurrentSession(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $activeSession = AcademicSession::query()
            ->where('is_active', true)
            ->latest('start_date')
            ->first();

        if (!$activeSession) {
            return response()->json(['message' => 'No active academic session available.'], 404);
        }

        $alreadyEnrolled = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->where('academic_session_id', $activeSession->id)
            ->exists();

        if ($alreadyEnrolled) {
            return response()->json(['message' => 'You are already enrolled in the current session.'], 409);
        }

        $courseEnrolment = CourseEnrolment::query()
            ->where('student_id', $student->id)
            ->latest()
            ->first();

        $enrolment = AcademicSessionEnrolment::create([
            'student_id' => $student->id,
            'academic_session_id' => $activeSession->id,
            'course_enrolment_id' => $courseEnrolment?->id,
            'status' => 'enrolled',
            'enrolled_at' => now(),
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $enrolment->load('academicSession');

        try {
            $this->billingService->createInvoiceForStudent($student, $user->id, $activeSession);
        } catch (\Exception $e) {
            // invoice generation is non-blocking
        }

        return response()->json([
            'message' => 'Session registered successfully.',
            'data' => $this->transform($enrolment),
        ], 201);
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
            'status' => $enrolment->status,
            'enrolled_at' => $enrolment->enrolled_at,
            'created_at' => $enrolment->created_at,
        ];
    }

    private function paginationMeta($paginator, array $filters): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
            'filters' => $filters,
        ];
    }
}
