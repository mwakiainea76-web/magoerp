<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStudentRequest;
use App\Http\Requests\UpdateStudentRequest;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'admission_number' => 'admission_number',
            'first_name' => 'first_name',
            'last_name' => 'last_name',
            'created_at' => 'created_at',
        ];

        $students = Student::query()
            ->with(['user', 'course'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('admission_number', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhereHas('course', function ($courseQuery) use ($search) {
                            $courseQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            })
            ->orderBy($sortableColumns[$sortBy] ?? 'admission_number', $sortDirection)
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

        $count = Student::withTrashed()->count();
        $year = now()->format('y');
        $nextNumber = str_pad($count + 1, 3, '0', STR_PAD_LEFT);

        return response()->json([
            'next_admission_number' => "STU/{$nextNumber}/{$year}",
        ]);
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $student = DB::transaction(function () use ($request) {
            $count = Student::withTrashed()->count();
            $year = now()->format('y');
            $nextNumber = str_pad($count + 1, 3, '0', STR_PAD_LEFT);
            $admissionNumber = "STU/{$nextNumber}/{$year}";

            $user = User::create([
                'login_id' => $admissionNumber,
                'email' => $request->email,
                'password' => bcrypt($request->phone_number),
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

            $student = Student::create([
                'user_id' => $user->id,
                'admission_number' => $admissionNumber,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'course_id' => $request->course_id,
                'enrollment_date' => $request->enrollment_date ?? now()->format('Y-m-d'),
                'status' => $request->status,
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            \App\Http\Controllers\Api\CourseEnrolmentsController::createForStudent($student, $request->user()->id);

            $student->load(['user', 'course']);

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

        $student->load(['user', 'course']);

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
                'course_id' => $request->course_id,
                'enrollment_date' => $request->enrollment_date ?? now()->format('Y-m-d'),
                'status' => $request->status,
                'updated_by' => $request->user()->id,
            ]);

            $student->load(['user', 'course']);

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

    private function transformStudent(Student $student): array
    {
        $user = $student->user;
        $course = $student->course;

        return [
            'id' => $student->id,
            'user_id' => $student->user_id,

            'login_id' => $user?->login_id,
            'email' => $user?->email,

            'admission_number' => $student->admission_number,

            'first_name' => $student->first_name,
            'middle_name' => $student->middle_name,
            'last_name' => $student->last_name,
            'full_name' => trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' ')),

            'gender' => $user?->gender,
            'date_of_birth' => $user?->date_of_birth?->format('Y-m-d'),
            'nationality' => $user?->nationality,
            'national_id' => $user?->national_id,
            'place_of_birth' => $user?->place_of_birth,
            'religion' => $user?->religion,
            'phone_number' => $user?->phone_number,
            'alternative_phone_number' => $user?->alternative_phone_number,

            'county' => $user?->county,

            'course_id' => $student->course_id,
            'course_name' => $course?->name,
            'course_code' => $course?->code,

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
