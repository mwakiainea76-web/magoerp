<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCourseEnrolmentStatusRequest;
use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\CourseCurriculum;
use App\Models\CourseEnrolment;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseEnrolmentsController extends Controller
{
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
            ->with(['student', 'course', 'curriculum', 'academicSession'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->whereHas('student', function ($sq) use ($search) {
                            $sq->where('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('admission_number', 'like', "%{$search}%");
                        })
                        ->orWhereHas('course', function ($cq) use ($search) {
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

        $course_enrolment->load(['student', 'course', 'curriculum', 'academicSession']);

        return response()->json([
            'data' => $this->transform($course_enrolment),
        ]);
    }

    public function updateStatus(UpdateCourseEnrolmentStatusRequest $request, CourseEnrolment $course_enrolment): JsonResponse
    {
        $data = [
            'status' => $request->status,
            'remarks' => $request->remarks,
            'updated_by' => $request->user()->id,
        ];

        // If transferring to a new course, update the course_id
        if ($request->filled('course_id') && $request->status === 'transferred') {
            $data['course_id'] = $request->course_id;
        }

        $course_enrolment->update($data);
        $course_enrolment->load(['student', 'course', 'curriculum', 'academicSession']);

        return response()->json([
            'message' => 'Enrolment status updated successfully.',
            'data' => $this->transform($course_enrolment),
        ]);
    }

    public static function createForStudent(Student $student, ?string $createdBy = null): CourseEnrolment
    {
        $course = $student->course;

        // Pick the first active curriculum for this course
        $curriculumId = null;
        if ($course) {
            $activePivot = CourseCurriculum::query()
                ->where('course_id', $course->id)
                ->where('is_active', true)
                ->first();
            $curriculumId = $activePivot?->curriculum_id;
        }

        // Pick the latest active academic session
        $session = AcademicSession::query()
            ->where('is_active', true)
            ->latest('start_date')
            ->first();

        return CourseEnrolment::create([
            'student_id' => $student->id,
            'course_id' => $student->course_id,
            'curriculum_id' => $curriculumId,
            'academic_session_id' => $session?->id,
            'enrolment_date' => now()->format('Y-m-d'),
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
            'course_id' => $enrolment->course_id,
            'course_code' => $enrolment->course?->code,
            'course_name' => $enrolment->course?->name,
            'curriculum_id' => $enrolment->curriculum_id,
            'curriculum_name' => $enrolment->curriculum?->name,
            'academic_session_id' => $enrolment->academic_session_id,
            'academic_session_name' => $enrolment->academicSession?->name,
            'enrolment_date' => $enrolment->enrolment_date?->format('Y-m-d'),
            'status' => $enrolment->status,
            'remarks' => $enrolment->remarks,
            'created_at' => $enrolment->created_at,
            'updated_at' => $enrolment->updated_at,
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
