<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStudentRequest;
use App\Http\Requests\UpdateStudentRequest;
use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class StudentsController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'admission_number' => 'admission_number',
            'first_name' => User::select('first_name')->whereColumn('users.id', 'students.user_id'),
            'last_name' => User::select('last_name')->whereColumn('users.id', 'students.user_id'),
            'created_at' => 'created_at',
        ];

        $sortColumn = $sortableColumns[$sortBy] ?? 'admission_number';

        $students = Student::query()
            ->with(['user', 'courseEnrolments.courseCurriculum.course'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('admission_number', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('courseEnrolments.courseCurriculum.course', function ($courseQuery) use ($search) {
                            $courseQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            })
            ->orderBy($sortColumn, $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $students->getCollection()->map(fn (Student $student) => $this->transformStudent($student))->values(),
            'meta' => $this->paginationMeta($students, [
                'q' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function meta(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('students.create'), 403);

        $validated = $request->validate([
            'course_id' => ['required', 'uuid', 'exists:courses,id'],
        ]);

        $course = Course::query()->findOrFail($validated['course_id']);

        return response()->json([
            'next_admission_number' => $this->nextAdmissionNumber($course),
        ]);
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $student = DB::transaction(function () use ($request) {
            $course = Course::query()
                ->lockForUpdate()
                ->findOrFail($request->course_id);
            $enrollmentDate = Carbon::parse($request->enrollment_date ?? now());
            $admissionNumber = $this->nextAdmissionNumber($course);

            $user = User::create([
                'login_id' => $admissionNumber,
                'email' => $request->email,
                'password' => bcrypt('password'),
                'role' => 'student',
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'gender' => $request->gender,
                'date_of_birth' => $request->date_of_birth,
                'nationality' => $request->nationality,
                'national_id' => $request->national_id,
                'place_of_birth' => $request->place_of_birth,
                'religion' => $request->religion,
                'phone_number' => $request->phone_number,
                'alternative_phone_number' => $request->alternative_phone_number,
                'county' => $request->county,
                'is_pwd' => $request->is_pwd,
                'disability_type' => $request->disability_type,
                'disability_description' => $request->disability_description,
                'next_of_kin_first_name' => $request->next_of_kin_first_name,
                'next_of_kin_last_name' => $request->next_of_kin_last_name,
                'next_of_kin_phone' => $request->next_of_kin_phone,
                'next_of_kin_alt_phone' => $request->next_of_kin_alt_phone,
                'next_of_kin_email' => $request->next_of_kin_email,
                'next_of_kin_relationship' => $request->next_of_kin_relationship,
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            $user->assignRole('student');

            $activeCourseCurriculum = \App\Models\CourseCurriculum::query()
                ->where('course_id', $course->id)
                ->where('is_active', true)
                ->first();

            $student = Student::create([
                'user_id' => $user->id,
                'admission_number' => $admissionNumber,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'course_curriculum_id' => $activeCourseCurriculum?->id,
                'enrollment_date' => $enrollmentDate->toDateString(),
                'status' => $request->status,
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            \App\Http\Controllers\Api\CourseEnrolmentsController::createForStudent($student, $request->user()->id, $course->id);

            $student->load(['user', 'courseEnrolments.courseCurriculum.course']);

            return $student;
        });

        return response()->json([
            'message' => 'Student admitted successfully.',
            'data' => $this->transformStudent($student),
        ], 201);
    }

    public function show(Request $request, Student $student): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $student->load(['user', 'courseEnrolments.courseCurriculum.course']);

        return response()->json([
            'data' => $this->transformStudent($student),
        ]);
    }

    public function update(UpdateStudentRequest $request, Student $student): JsonResponse
    {
        $student = DB::transaction(function () use ($request, $student) {
            $user = $student->user;

            $user->update([
                'email' => $request->email,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'gender' => $request->gender,
                'date_of_birth' => $request->date_of_birth,
                'nationality' => $request->nationality,
                'national_id' => $request->national_id,
                'place_of_birth' => $request->place_of_birth,
                'religion' => $request->religion,
                'phone_number' => $request->phone_number,
                'alternative_phone_number' => $request->alternative_phone_number,
                'county' => $request->county,
                'is_pwd' => $request->is_pwd,
                'disability_type' => $request->disability_type,
                'disability_description' => $request->disability_description,
                'next_of_kin_first_name' => $request->next_of_kin_first_name,
                'next_of_kin_last_name' => $request->next_of_kin_last_name,
                'next_of_kin_phone' => $request->next_of_kin_phone,
                'next_of_kin_alt_phone' => $request->next_of_kin_alt_phone,
                'next_of_kin_email' => $request->next_of_kin_email,
                'next_of_kin_relationship' => $request->next_of_kin_relationship,
                'updated_by' => $request->user()->id,
            ]);

            $student->update([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'enrollment_date' => $request->enrollment_date ?? now()->format('Y-m-d'),
                'status' => $request->status,
                'updated_by' => $request->user()->id,
            ]);

            $student->load(['user', 'courseEnrolments.courseCurriculum.course']);

            return $student;
        });

        return response()->json([
            'message' => 'Student updated successfully.',
            'data' => $this->transformStudent($student),
        ]);
    }

    public function destroy(Request $request, Student $student): JsonResponse
    {
        abort_unless($request->user()?->can('students.delete'), 403);

        $student->delete();

        return response()->json([
            'message' => 'Student deleted successfully.',
        ]);
    }

    public function admissionLetter(Request $request, Student $student): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $student->load(['user']);

        $enrolment = CourseEnrolment::query()
            ->with(['courseCurriculum.course.department', 'courseCurriculum.course.level', 'courseCurriculum.course.authority', 'courseCurriculum.curriculum', 'academicSession'])
            ->where('student_id', $student->id)
            ->latest()
            ->first();

        $user = $student->user;
        $course = $enrolment?->courseCurriculum?->course;

        return response()->json([
            'data' => [
                'institution_name' => config('app.name'),
                'reference_number' => $student->admission_number,
                'date' => now()->format('F d, Y'),

                'student_name' => trim(collect([$user->first_name, $user->middle_name, $user->last_name])->filter()->implode(' ')),
                'admission_number' => $student->admission_number,
                'email' => $user?->email,
                'phone' => $user?->phone_number,
                'admission_date' => $student->enrollment_date?->format('F d, Y'),
                'gender' => $user?->gender,
                'nationality' => $user?->nationality,

                'course_name' => $course?->name,
                'course_code' => $course?->code,
                'department_name' => $course?->department?->name,
                'certification_level' => $course?->level?->name,
                'certification_authority' => $course?->authority?->name,
                'curriculum_name' => $enrolment?->courseCurriculum?->curriculum?->name,
                'academic_session' => $enrolment?->academicSession?->name,
                'enrolment_status' => $enrolment?->status,
                'duration' => $course?->duration,

                'portal_url' => url('/'),
                'login_id' => $user?->login_id,
            ],
        ]);
    }

    private function transformStudent(Student $student): array
    {
        $user = $student->user;
        $activeEnrolment = $student->courseEnrolments?->first();
        $course = $activeEnrolment?->courseCurriculum?->course;

        return [
            'id' => $student->id,
            'user_id' => $student->user_id,

            'login_id' => $user?->login_id,
            'email' => $user?->email,

            'admission_number' => $student->admission_number,

            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'full_name' => trim(collect([$user->first_name, $user->middle_name, $user->last_name])->filter()->implode(' ')),

            'gender' => $user?->gender,
            'date_of_birth' => $user?->date_of_birth?->format('Y-m-d'),
            'nationality' => $user?->nationality,
            'national_id' => $user?->national_id,
            'place_of_birth' => $user?->place_of_birth,
            'religion' => $user?->religion,
            'phone_number' => $user?->phone_number,
            'alternative_phone_number' => $user?->alternative_phone_number,

            'county' => $user?->county,

            'course_id' => $course?->id,
            'course_name' => $course?->name,
            'course_code' => $course?->code,
            'course_initials' => $course?->initials,

            'enrollment_date' => $student->enrollment_date?->format('Y-m-d'),

            'is_pwd' => $user?->is_pwd,
            'disability_type' => $user?->disability_type,
            'disability_description' => $user?->disability_description,

            'next_of_kin_first_name' => $user?->next_of_kin_first_name,
            'next_of_kin_last_name' => $user?->next_of_kin_last_name,
            'next_of_kin_phone' => $user?->next_of_kin_phone,
            'next_of_kin_alt_phone' => $user?->next_of_kin_alt_phone,
            'next_of_kin_email' => $user?->next_of_kin_email,
            'next_of_kin_relationship' => $user?->next_of_kin_relationship,

            'status' => $student->status,
            'created_at' => $student->created_at,
            'updated_at' => $student->updated_at,
        ];
    }

    private function nextAdmissionNumber(Course $course): string
    {
        $academicYear = AcademicYear::query()
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->first()
            ?? AcademicYear::query()->orderByDesc('start_date')->first();

        $count = CourseEnrolment::query()
            ->whereHas('courseCurriculum', fn ($q) => $q->where('course_id', $course->id))
            ->whereHas('student', fn ($q) => $q->withTrashed())
            ->count();

        $initials = Str::upper((string) preg_replace(
            '/[^A-Za-z0-9]/',
            '',
            $course->initials ?: $course->code,
        ));
        $initials = $initials !== '' ? $initials : 'STU';
        $sequence = str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
        $intakeYear = $academicYear?->start_date?->format('y') ?? now()->format('y');

        return "{$initials}/{$sequence}/{$intakeYear}";
    }


}
