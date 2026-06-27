<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCourseEnrolmentStatusRequest;
use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\CourseCurriculum;
use App\Models\CourseEnrolment;
use App\Models\Student;
use App\Models\StudentStatusLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class CourseEnrolmentsController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('enrolments.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'enrolment_date' => 'enrolment_date',
            'status' => 'status',
            'created_at' => 'created_at',
        ];

        $enrolments = CourseEnrolment::query()
            ->with(['student', 'courseCurriculum.course', 'courseCurriculum.curriculum', 'academicSession'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->whereHas('student', function ($sq) use ($search) {
                            $sq->where('admission_number', 'like', "%{$search}%");
                        })
                        ->orWhereHas('student.user', function ($uq) use ($search) {
                            $uq->where('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('courseCurriculum.course', function ($cq) use ($search) {
                            $cq->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->orderBy($sortableColumns[$sortBy] ?? 'enrolment_date', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $enrolments->getCollection()->map(fn (CourseEnrolment $enrolment) => $this->transform($enrolment))->values(),
            'meta' => $this->paginationMeta($enrolments, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function show(Request $request, CourseEnrolment $course_enrolment): JsonResponse
    {
        abort_unless($request->user()?->can('enrolments.view'), 403);

        $course_enrolment->load(['student', 'courseCurriculum.course', 'courseCurriculum.curriculum', 'academicSession']);

        return response()->json([
            'data' => $this->transform($course_enrolment),
        ]);
    }

    public function updateStatus(UpdateCourseEnrolmentStatusRequest $request, CourseEnrolment $course_enrolment): JsonResponse
    {
        $oldStatus = $course_enrolment->status;

        if ($request->status === 'transferred' && $request->filled('course_id') && $request->course_id !== $course_enrolment->courseCurriculum?->course_id) {
            // Old enrolment retains original course_id, marks as transferred
            $course_enrolment->update([
                'status' => 'transferred',
                'remarks' => $request->remarks,
                'updated_by' => $request->user()->id,
            ]);

            // Create new enrolment for the new course
            $newCourseCurriculum = CourseCurriculum::query()
                ->where('course_id', $request->course_id)
                ->where('is_active', true)
                ->first();

            $newEnrolment = CourseEnrolment::create([
                'student_id' => $course_enrolment->student_id,
                'course_curriculum_id' => $newCourseCurriculum?->id,
                'academic_session_id' => $course_enrolment->academic_session_id,
                'enrolment_date' => now()->toDateString(),
                'status' => 'enrolled',
                'remarks' => 'Transferred from ' . ($course_enrolment->courseCurriculum?->course?->name ?? 'previous course'),
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            StudentStatusLog::create([
                'student_id' => $course_enrolment->student_id,
                'course_enrolment_id' => $course_enrolment->id,
                'from_status' => $oldStatus,
                'to_status' => 'transferred',
                'reason' => $request->remarks,
                'effective_date' => now()->toDateString(),
                'recorded_by' => $request->user()->id,
            ]);

            $course_enrolment->load(['student', 'courseCurriculum.course', 'courseCurriculum.curriculum', 'academicSession']);

            return response()->json([
                'message' => 'Student transferred to new course successfully.',
                'data' => $this->transform($course_enrolment),
            ]);
        }

        // Regular (non-transfer) status update
        $data = [
            'status' => $request->status,
            'remarks' => $request->remarks,
            'updated_by' => $request->user()->id,
        ];

        $course_enrolment->update($data);

        StudentStatusLog::create([
            'student_id' => $course_enrolment->student_id,
            'course_enrolment_id' => $course_enrolment->id,
            'from_status' => $oldStatus,
            'to_status' => $request->status,
            'reason' => $request->remarks,
            'effective_date' => now()->toDateString(),
            'recorded_by' => $request->user()->id,
        ]);

        $course_enrolment->load(['student', 'courseCurriculum.course', 'courseCurriculum.curriculum', 'academicSession']);

        return response()->json([
            'message' => 'Enrolment status updated successfully.',
            'data' => $this->transform($course_enrolment),
        ]);
    }

    public function statusLogs(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('enrolments.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', '');
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $logs = StudentStatusLog::query()
            ->with(['student', 'recordedBy'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->whereHas('student', function ($sq) use ($search) {
                        $sq->where('admission_number', 'like', "%{$search}%");
                    })->orWhereHas('student.user', function ($uq) use ($search) {
                        $uq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
                });
            })
            ->when($status !== '', fn ($q) => $q->where('to_status', $status))
            ->latest('effective_date')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $logs->getCollection()->map(fn (StudentStatusLog $log) => [
                'id' => $log->id,
                'student_name' => trim(collect([$log->student?->first_name, $log->student?->middle_name, $log->student?->last_name])->filter()->implode(' ')),
                'admission_number' => $log->student?->admission_number,
                'from_status' => $log->from_status,
                'to_status' => $log->to_status,
                'reason' => $log->reason,
                'effective_date' => $log->effective_date?->format('Y-m-d'),
                'recorded_by' => trim(collect([$log->recordedBy?->first_name, $log->recordedBy?->middle_name, $log->recordedBy?->last_name])->filter()->implode(' ')),
                'created_at' => $log->created_at,
            ])->values(),
            'meta' => $this->paginationMeta($logs, [
                'q' => $search,
                'status' => $status,
            ]),
        ]);
    }

    public static function createForStudent(Student $student, ?string $createdBy = null, ?string $courseId = null): CourseEnrolment
    {
        if (!$courseId && $student->courseCurriculum) {
            $courseId = $student->courseCurriculum->course_id;
        }

        $activePivot = null;

        if ($courseId) {
            $activePivot = CourseCurriculum::query()
                ->where('course_id', $courseId)
                ->where('is_active', true)
                ->first();
        }

        $session = AcademicSession::query()
            ->where('is_active', true)
            ->latest('start_date')
            ->first();

        $courseCurriculumId = $activePivot?->id;

        return CourseEnrolment::create([
            'student_id' => $student->id,
            'course_curriculum_id' => $courseCurriculumId,
            'academic_session_id' => $session?->id,
            'enrolment_date' => $student->enrollment_date?->toDateString() ?? now()->format('Y-m-d'),
            'status' => 'enrolled',
            'created_by' => $createdBy,
            'updated_by' => $createdBy,
        ]);
    }

    private function transform(CourseEnrolment $enrolment): array
    {
        return [
            'id' => $enrolment->id,
            'student_id' => $enrolment->student_id,
            'student_name' => $enrolment->student?->full_name ?? trim(collect([$enrolment->student?->first_name, $enrolment->student?->middle_name, $enrolment->student?->last_name])->filter()->implode(' ')),
            'admission_number' => $enrolment->student?->admission_number,
            'course_id' => $enrolment->courseCurriculum?->course_id,
            'course_curriculum_id' => $enrolment->course_curriculum_id,
            'course_code' => $enrolment->courseCurriculum?->course?->code,
            'course_name' => $enrolment->courseCurriculum?->course?->name,
            'curriculum_id' => $enrolment->courseCurriculum?->curriculum_id,
            'curriculum_name' => $enrolment->courseCurriculum?->curriculum?->name,
            'academic_session_id' => $enrolment->academic_session_id,
            'academic_session_name' => $enrolment->academicSession?->name,
            'enrolment_date' => $enrolment->enrolment_date?->format('Y-m-d'),
            'status' => $enrolment->status,
            'remarks' => $enrolment->remarks,
            'created_at' => $enrolment->created_at,
            'updated_at' => $enrolment->updated_at,
        ];
    }

}
