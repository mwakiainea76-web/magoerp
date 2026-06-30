<?php

namespace App\Queries;

use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class StudentQuery
{
    public function filters(Request $request): array
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:200'],
            'status' => ['nullable', 'in:all,active,inactive'],
            'course_id' => ['nullable', 'uuid', 'exists:courses,id'],
            'curriculum_id' => ['nullable', 'uuid', 'exists:curriculums,id'],
            'level_id' => ['nullable', 'uuid', 'exists:certification_levels,id'],
            'exam_body_id' => ['nullable', 'uuid', 'exists:certification_authorities,id'],
            'gender' => ['nullable', 'in:male,female'],
            'admission_number' => ['nullable', 'string', 'max:50'],
            'sort_by' => ['nullable', 'in:admission_number,first_name,last_name,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
        ]);

        return [
            'q' => trim((string) ($validated['q'] ?? '')),
            'status' => (($validated['status'] ?? '') !== '' ? $validated['status'] : 'all'),
            'course_id' => $validated['course_id'] ?? null,
            'curriculum_id' => $validated['curriculum_id'] ?? null,
            'level_id' => $validated['level_id'] ?? null,
            'exam_body_id' => $validated['exam_body_id'] ?? null,
            'gender' => $validated['gender'] ?? '',
            'admission_number' => $validated['admission_number'] ?? '',
            'sort_by' => $validated['sort_by'] ?? 'created_at',
            'sort_direction' => $validated['sort_direction'] ?? 'desc',
        ];
    }

    public function build(array $filters): Builder
    {
        $search = $filters['q'];
        $sortColumn = match ($filters['sort_by']) {
            'first_name' => User::select('first_name')->whereColumn('users.id', 'students.user_id'),
            'last_name' => User::select('last_name')->whereColumn('users.id', 'students.user_id'),
            'created_at' => 'students.created_at',
            default => 'students.admission_number',
        };

        return Student::query()
            ->with([
                'user',
                'activeEnrolment.courseCurriculum.course.authority',
                'activeEnrolment.courseCurriculum.course.level',
                'activeEnrolment.courseCurriculum.curriculum',
            ])
            ->when($filters['admission_number'] !== '', fn (Builder $query) => $query->where('students.admission_number', 'like', '%'.$filters['admission_number'].'%'))
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $innerQuery) use ($search) {
                    $innerQuery
                        ->where('students.admission_number', 'like', "%{$search}%")
                        ->orWhereHas('user', function (Builder $userQuery) use ($search) {
                            $userQuery->where('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('activeEnrolment.courseCurriculum.course', function (Builder $courseQuery) use ($search) {
                            $courseQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            })
            ->when($filters['status'] !== 'all', fn (Builder $query) => $query->where(
                'students.status',
                $filters['status'] === 'active',
            ))
            ->when($filters['course_id'], fn (Builder $query, string $courseId) => $query->whereHas(
                'activeEnrolment.courseCurriculum',
                fn (Builder $mappingQuery) => $mappingQuery->where('course_id', $courseId),
            ))
            ->when($filters['curriculum_id'], fn (Builder $query, string $curriculumId) => $query->whereHas(
                'activeEnrolment.courseCurriculum',
                fn (Builder $mappingQuery) => $mappingQuery->where('curriculum_id', $curriculumId),
            ))
            ->when($filters['level_id'], fn (Builder $query, string $levelId) => $query->whereHas(
                'activeEnrolment.courseCurriculum.course',
                fn (Builder $courseQuery) => $courseQuery->where('certification_level_id', $levelId),
            ))
            ->when($filters['exam_body_id'], fn (Builder $query, string $examBodyId) => $query->whereHas(
                'activeEnrolment.courseCurriculum.course',
                fn (Builder $courseQuery) => $courseQuery->where('certification_authority_id', $examBodyId),
            ))
            ->when($filters['gender'] !== '', fn (Builder $query) => $query->whereHas(
                'user',
                fn (Builder $userQuery) => $userQuery->where('gender', $filters['gender']),
            ))
            ->orderBy($sortColumn, $filters['sort_direction'])
            ->orderBy('students.id');
    }
}
