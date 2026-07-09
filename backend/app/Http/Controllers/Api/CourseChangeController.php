<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSessionEnrolment;
use App\Models\Course;
use App\Models\CourseChangeLog;
use App\Models\CourseCurriculum;
use App\Models\CourseEnrolment;
use App\Models\Curriculum;
use App\Models\CurriculumTransfer;
use App\Models\Invoice;
use App\Models\StudentLedgerEntry;
use App\Models\Student;
use App\Services\AdmissionNumberService;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class CourseChangeController extends Controller
{
    public function lookupStudent(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $request->validate([
            'admission_number' => ['required', 'string', 'max:255'],
        ]);

        $student = Student::query()
            ->with(['user', 'courseEnrolments' => function ($q) {
                $q->with(['courseCurriculum.course', 'courseCurriculum.curriculum'])->where('status', 'enrolled')->latest();
            }])
            ->where('admission_number', $request->admission_number)
            ->first();

        if (!$student) {
            return response()->json([ 'message' => 'Student not found.'], 404);
        }

        if ($student->status !== 'active') {
            return response()->json([ 'message' => 'Student is not active.'], 422);
        }

        $activeEnrolment = $student->courseEnrolments->first();

        return response()->json([
            'data' => [
                'id' => $student->id,
                'admission_number' => $student->admission_number,
                'full_name' => trim(collect([$student->user->first_name, $student->user->middle_name, $student->user->last_name])->filter()->implode(' ')),
                'first_name' => $student->user->first_name,
                'middle_name' => $student->user->middle_name,
                'last_name' => $student->user->last_name,
                'course_id' => $activeEnrolment?->courseCurriculum?->course_id,
                'course_name' => $activeEnrolment?->courseCurriculum?->course?->name,
                'course_code' => $activeEnrolment?->courseCurriculum?->course?->code,
                'curriculum_id' => $activeEnrolment?->courseCurriculum?->curriculum_id,
                'curriculum_name' => $activeEnrolment?->courseCurriculum?->curriculum?->name,
                'enrolment_status' => $activeEnrolment?->status,
                'enrolment_date' => $activeEnrolment?->enrolment_date?->format('Y-m-d'),
            ],
        ]);
    }

    public function availableMappings(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
        ]);

        $student = Student::query()->findOrFail($request->student_id);

        $currentCourseId = CourseEnrolment::query()
            ->where('student_id', $student->id)
            ->where('status', 'enrolled')
            ->latest()
            ->first()?->courseCurriculum?->course_id;

        $activeMappings = CourseCurriculum::query()
            ->with(['course', 'curriculum'])
            ->whereHas('course', function ($q) {
                $q->where('is_active', true);
            })
            ->where('is_active', true)
            ->when($currentCourseId, fn ($q) => $q->where('course_id', '!=', $currentCourseId))
            ->get()
            ->map(fn (CourseCurriculum $mapping) => [
                'id' => $mapping->id,
                'course_id' => $mapping->course_id,
                'course_name' => $mapping->course?->name,
                'course_code' => $mapping->course?->code,
                'course_initials' => $mapping->course?->initials,
                'curriculum_id' => $mapping->curriculum_id,
                'curriculum_name' => $mapping->curriculum?->name,
            ])
            ->groupBy('course_name')
            ->toArray();

        return response()->json([ 'data' => $activeMappings]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('students.update'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'to_curriculum_mapping_id' => ['required', 'uuid', 'exists:course_curricula,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $processedBy = $request->user();

        $result = DB::transaction(function () use ($validated, $processedBy) {
            $student = Student::query()->lockForUpdate()->findOrFail($validated['student_id']);

            abort_unless($student->status === 'active', 422, 'Student is not active.');

            $oldEnrolment = CourseEnrolment::query()
                ->lockForUpdate()
                ->with('courseCurriculum.course')
                ->where('student_id', $student->id)
                ->where('status', 'enrolled')
                ->latest()
                ->first();

            abort_unless($oldEnrolment, 422, 'No active enrolment found for this student.');

            $toMapping = CourseCurriculum::query()->findOrFail($validated['to_curriculum_mapping_id']);

            abort_if($toMapping->course_id === $oldEnrolment->courseCurriculum?->course_id, 422, 'Student is already enrolled in this course.');

            $toCourse = Course::query()->lockForUpdate()->findOrFail($toMapping->course_id);

            $admissionNumberService = app(AdmissionNumberService::class);
            $newAdmissionNumber = $admissionNumberService->generateForCourse($toCourse);

            $oldEnrolment->update([
                'status' => 'transferred',
                'remarks' => $validated['notes'] ?? 'Course transfer initiated.',
                'updated_by' => $processedBy->id,
            ]);

            $currentSessionEnrolment = AcademicSessionEnrolment::where('student_id', $student->id)
                ->where('status', 'ongoing')
                ->latest()
                ->first();

            AcademicSessionEnrolment::query()
                ->where('student_id', $student->id)
                ->when($currentSessionEnrolment, fn ($q) => $q->where('academic_session_id', $currentSessionEnrolment->academic_session_id))
                ->update(['status' => 'deactivated']);

            $invoicesToReverse = Invoice::query()
                ->where('student_id', $student->id)
                ->when($currentSessionEnrolment, fn ($q) => $q->where('academic_session_id', $currentSessionEnrolment->academic_session_id))
                ->where('invoice_type', 'fees')
                ->whereNotIn('status', ['cancelled', 'reversed'])
                ->get();

            $syncedSessions = [];
            foreach ($invoicesToReverse as $invoice) {
                $paid = (float) $invoice->paymentAllocations()->sum('amount');
                $balanceDue = max(0, (float) $invoice->amount_due - $paid);

                if ($balanceDue > 0) {
                    StudentLedgerEntry::create([
                        'student_id' => $invoice->student_id,
                        'invoice_id' => $invoice->id,
                        'academic_session_id' => $invoice->academic_session_id,
                        'type' => 'invoice_reversal',
                        'debit' => 0,
                        'credit' => $balanceDue,
                        'description' => 'Full reversal due to course transfer.',
                        'transaction_date' => now()->toDateString(),
                        'created_by' => $processedBy->id,
                    ]);

                    $invoice->recalculateTotals();
                }

                $invoice->update(['status' => 'reversed']);
                if ($invoice->academic_session_id) {
                    $syncedSessions[$invoice->academic_session_id] = true;
                }
            }

            foreach (array_keys($syncedSessions) as $sessionId) {
                app(BillingService::class)->syncAccountBalance($student->id, $sessionId);
            }

            $newEnrolment = CourseEnrolment::create([
                'student_id' => $student->id,
                'course_curriculum_id' => $toMapping->id,
                'academic_session_id' => $currentSessionEnrolment?->academic_session_id,
                'enrolment_date' => now()->format('Y-m-d'),
                'status' => 'active',
                'remarks' => 'Course transfer from ' . ($oldEnrolment->courseCurriculum?->course?->name ?? 'previous') . '.',
                'created_by' => $processedBy->id,
                'updated_by' => $processedBy->id,
            ]);

            $oldAdmissionNumber = $student->admission_number;
            $changedAt = now();

            $fromMappingId = $oldEnrolment->course_curriculum_id;

            $student->user?->update(['login_id' => $newAdmissionNumber]);

            $student->update([
                'admission_number' => $newAdmissionNumber,
                'updated_by' => $processedBy->id,
            ]);

            $courseChangeLog = CourseChangeLog::create([
                'student_id' => $student->id,
                'old_admission_number' => $oldAdmissionNumber,
                'new_admission_number' => $newAdmissionNumber,
                'old_course_curriculum_id' => $fromMappingId,
                'new_course_curriculum_id' => $toMapping->id,
                'processed_by' => $processedBy->id,
                'changed_at' => $changedAt,
                'notes' => $validated['notes'] ?? null,
            ]);

            CurriculumTransfer::create([
                'student_id' => $student->id,
                'from_curriculum_mapping_id' => $fromMappingId,
                'to_curriculum_mapping_id' => $toMapping->id,
                'transfer_date' => $changedAt->format('Y-m-d'),
                'reason' => $validated['notes'] ?? null,
                'approved_by' => null,
            ]);

            $student->load(['user']);

            return [
                'student' => [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'full_name' => trim(collect([$student->user->first_name, $student->user->middle_name, $student->user->last_name])->filter()->implode(' ')),
                    'course_name' => $newEnrolment->courseCurriculum?->course?->name,
                ],
                'old_admission_number' => $courseChangeLog->old_admission_number,
                'new_admission_number' => $courseChangeLog->new_admission_number,
                'changed_at' => $changedAt->toDateTimeString(),
            ];
        });

        return response()->json([
            'message' => 'Course transfer completed successfully.',
            'data' => $result,
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
        ]);

        $logs = CourseChangeLog::query()
            ->with(['student.user', 'processedBy'])
            ->where('student_id', $request->student_id)
            ->orderByDesc('changed_at')
            ->get()
            ->map(fn (CourseChangeLog $log) => [
                'id' => $log->id,
                'old_admission_number' => $log->old_admission_number,
                'new_admission_number' => $log->new_admission_number,
                'notes' => $log->notes,
                'processed_by' => trim(collect([$log->processedBy?->first_name, $log->processedBy?->middle_name, $log->processedBy?->last_name])->filter()->implode(' ')),
                'changed_at' => $log->changed_at?->format('Y-m-d H:i:s'),
            ]);

        return response()->json([ 'data' => $logs]);
    }

    public function allTransfers(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $transfers = CourseChangeLog::query()
            ->with(['student.user', 'processedBy'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('old_admission_number', 'like', "%{$search}%")
                        ->orWhere('new_admission_number', 'like', "%{$search}%")
                        ->orWhereHas('student', fn ($sq) => $sq
                            ->where('admission_number', 'like', "%{$search}%"))
                        ->orWhereHas('student.user', fn ($uq) => $uq
                            ->where('first_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('changed_at')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $transfers->getCollection()->map(fn (CourseChangeLog $log) => [
                'id' => $log->id,
                'student_name' => trim(collect([$log->student?->user?->first_name, $log->student?->user?->middle_name, $log->student?->user?->last_name])->filter()->implode(' ')),
                'old_admission_number' => $log->old_admission_number,
                'new_admission_number' => $log->new_admission_number,
                'notes' => $log->notes,
                'processed_by' => trim(collect([$log->processedBy?->first_name, $log->processedBy?->middle_name, $log->processedBy?->last_name])->filter()->implode(' ')),
                'changed_at' => $log->changed_at?->format('Y-m-d H:i:s'),
            ])->values(),
            'meta' => [
                'current_page' => $transfers->currentPage(),
                'last_page' => $transfers->lastPage(),
                'per_page' => $transfers->perPage(),
                'total' => $transfers->total(),
                'from' => $transfers->firstItem(),
                'to' => $transfers->lastItem(),
                'filters' => ['q' => $search],
            ],
        ]);
    }
}
