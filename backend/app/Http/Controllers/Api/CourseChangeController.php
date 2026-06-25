<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseChangeLog;
use App\Models\CourseCurriculum;
use App\Models\CourseEnrolment;
use App\Models\Curriculum;
use App\Models\CurriculumTransfer;
use App\Models\Student;
use App\Models\User;
use App\Services\AdmissionNumberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CourseChangeController extends Controller
{
    public function lookupStudent(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $request->validate([
            'admission_number' => ['required', 'string', 'max:255'],
        ]);

        $student = Student::query()
            ->with(['user', 'course', 'courseEnrolments' => function ($q) {
                $q->where('status', 'enrolled')->latest();
            }])
            ->where('admission_number', $request->admission_number)
            ->first();

        if (!$student) {
            return response()->json([ 'message' => 'Student not found.'], 404);
        }

        if (!$student->status) {
            return response()->json([ 'message' => 'Student is inactive.'], 422);
        }

        $activeEnrolment = $student->courseEnrolments->first();

        return response()->json([
            'data' => [
                'id' => $student->id,
                'admission_number' => $student->admission_number,
                'full_name' => trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' ')),
                'first_name' => $student->first_name,
                'middle_name' => $student->middle_name,
                'last_name' => $student->last_name,
                'course_id' => $student->course_id,
                'course_name' => $student->course?->name,
                'course_code' => $student->course?->code,
                'curriculum_id' => $activeEnrolment?->curriculum_id,
                'curriculum_name' => $activeEnrolment?->curriculum?->name,
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

        $activeMappings = CourseCurriculum::query()
            ->with(['course', 'curriculum'])
            ->whereHas('course', function ($q) {
                $q->where('is_active', true);
            })
            ->where('is_active', true)
            ->where('course_id', '!=', $student->course_id)
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
        abort_unless($request->user()?->can('students.edit'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'to_curriculum_mapping_id' => ['required', 'uuid', 'exists:course_curricula,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $processedBy = $request->user();

        $result = DB::transaction(function () use ($validated, $processedBy) {
            $student = Student::query()->lockForUpdate()->findOrFail($validated['student_id']);

            abort_unless((bool) $student->status, 422, 'Student is inactive.');

            $oldEnrolment = CourseEnrolment::query()
                ->lockForUpdate()
                ->where('student_id', $student->id)
                ->where('status', 'enrolled')
                ->latest()
                ->first();

            abort_unless($oldEnrolment, 422, 'No active enrolment found for this student.');

            $toMapping = CourseCurriculum::query()->findOrFail($validated['to_curriculum_mapping_id']);

            abort_if($toMapping->course_id === $student->course_id, 422, 'Student is already enrolled in this course.');

            $toCourse = Course::query()->lockForUpdate()->findOrFail($toMapping->course_id);

            $admissionNumberService = app(AdmissionNumberService::class);
            $newAdmissionNumber = $admissionNumberService->generateForCourse($toCourse);

            $oldUser = $student->user;
            $oldEmail = $oldUser?->email;
            $oldPassword = $oldUser?->password;

            $newUser = User::create([
                'login_id' => $newAdmissionNumber,
                'email' => $this->generatedTransferEmail($newAdmissionNumber),
                'password' => $oldPassword,
                'role' => 'student',
                'first_name' => $student->first_name,
                'middle_name' => $student->middle_name,
                'last_name' => $student->last_name,
                'gender' => $oldUser?->gender,
                'date_of_birth' => $oldUser?->date_of_birth,
                'nationality' => $oldUser?->nationality,
                'national_id' => $oldUser?->national_id,
                'place_of_birth' => $oldUser?->place_of_birth,
                'religion' => $oldUser?->religion,
                'phone_number' => $oldUser?->phone_number,
                'alternative_phone_number' => $oldUser?->alternative_phone_number,
                'county' => $oldUser?->county,
                'is_pwd' => $oldUser?->is_pwd,
                'disability_type' => $oldUser?->disability_type,
                'disability_description' => $oldUser?->disability_description,
                'next_of_kin_first_name' => $oldUser?->next_of_kin_first_name,
                'next_of_kin_last_name' => $oldUser?->next_of_kin_last_name,
                'next_of_kin_phone' => $oldUser?->next_of_kin_phone,
                'next_of_kin_alt_phone' => $oldUser?->next_of_kin_alt_phone,
                'next_of_kin_email' => $oldUser?->next_of_kin_email,
                'next_of_kin_relationship' => $oldUser?->next_of_kin_relationship,
                'created_by' => $processedBy->id,
                'updated_by' => $processedBy->id,
            ]);

            $newUser->assignRole('student');

            $oldEnrolment->update([
                'status' => 'transferred',
                'remarks' => $validated['notes'] ?? 'Course transfer initiated.',
                'updated_by' => $processedBy->id,
            ]);

            $newEnrolment = CourseEnrolment::create([
                'student_id' => $student->id,
                'course_id' => $toMapping->course_id,
                'curriculum_id' => $toMapping->curriculum_id,
                'academic_session_id' => $oldEnrolment->academic_session_id,
                'enrolment_date' => now()->format('Y-m-d'),
                'status' => 'enrolled',
                'remarks' => 'Course transfer from ' . ($oldEnrolment->course?->name ?? 'previous') . '.',
                'created_by' => $processedBy->id,
                'updated_by' => $processedBy->id,
            ]);

            $student->update([
                'user_id' => $newUser->id,
                'admission_number' => $newAdmissionNumber,
                'course_id' => $toMapping->course_id,
                'updated_by' => $processedBy->id,
            ]);

            if ($oldUser) {
                $oldUser->update([
                    'login_id' => $oldUser->login_id . '_transferred_' . now()->format('YmdHis'),
                    'status' => false,
                    'updated_by' => $processedBy->id,
                ]);
            }

            $changedAt = now();

            $courseChangeLog = CourseChangeLog::create([
                'student_id' => $student->id,
                'old_course_enrolment_id' => $oldEnrolment->id,
                'new_course_enrolment_id' => $newEnrolment->id,
                'old_curriculum_mapping_id' => $oldEnrolment->curriculum_id
                    ? CourseCurriculum::query()->where('course_id', $oldEnrolment->course_id)->where('curriculum_id', $oldEnrolment->curriculum_id)->value('id')
                    : null,
                'new_curriculum_mapping_id' => $toMapping->id,
                'old_admission_number' => $student->getOriginal('admission_number'),
                'new_admission_number' => $newAdmissionNumber,
                'old_user_id' => $oldUser?->id,
                'new_user_id' => $newUser->id,
                'processed_by' => $processedBy->id,
                'changed_at' => $changedAt,
                'notes' => $validated['notes'] ?? null,
            ]);

            CurriculumTransfer::create([
                'student_id' => $student->id,
                'from_curriculum_mapping_id' => $oldEnrolment->curriculum_id
                    ? CourseCurriculum::query()->where('course_id', $oldEnrolment->course_id)->where('curriculum_id', $oldEnrolment->curriculum_id)->value('id')
                    : CourseCurriculum::query()->where('course_id', $toMapping->course_id)->where('curriculum_id', $toMapping->curriculum_id)->first()->id,
                'to_curriculum_mapping_id' => $toMapping->id,
                'transfer_date' => $changedAt->format('Y-m-d'),
                'reason' => $validated['notes'] ?? null,
                'approved_by' => null,
            ]);

            $student->load(['user', 'course']);

            return [
                'student' => [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'full_name' => trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' ')),
                    'course_name' => $student->course?->name,
                ],
                'old_admission_number' => $courseChangeLog->old_admission_number,
                'new_admission_number' => $courseChangeLog->new_admission_number,
                'new_login_id' => $newUser->login_id,
                'new_email' => $newUser->email,
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
            ->with(['student', 'processedBy'])
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
            ->with(['student', 'processedBy'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('old_admission_number', 'like', "%{$search}%")
                        ->orWhere('new_admission_number', 'like', "%{$search}%")
                        ->orWhereHas('student', fn ($sq) => $sq
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
                'student_name' => trim(collect([$log->student?->first_name, $log->student?->middle_name, $log->student?->last_name])->filter()->implode(' ')),
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

    private function generatedTransferEmail(string $admissionNumber): string
    {
        $slug = Str::slug($admissionNumber);
        return "{$slug}@transfer.magoerp.com";
    }
}
