<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use App\Models\CourseCurriculum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class CoursesController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $authorityId = (string) $request->string('certification_authority_id', '');
        $levelId = (string) $request->string('certification_level_id', '');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'code' => 'code',
            'name' => 'name',
            'initials' => 'initials',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $courses = Course::query()
            ->with(['authority', 'level', 'department', 'curricula'])
            ->when($authorityId !== '', fn ($q) => $q->where('certification_authority_id', $authorityId))
            ->when($levelId !== '', fn ($q) => $q->where('certification_level_id', $levelId))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('initials', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $courses->getCollection()->map(fn (Course $course) => $this->transformCourse($course))->values(),
            'meta' => $this->paginationMeta($courses, [
                'q' => $search,
                'status' => $status,
                'certification_authority_id' => $authorityId,
                'certification_level_id' => $levelId,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        /** @var Course $course */
        $course = Course::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        if ($request->filled('curriculum_id')) {
            CourseCurriculum::create([
                'id' => (string) Str::uuid(),
                'course_id' => $course->id,
                'curriculum_id' => $request->curriculum_id,
                'is_active' => true,
            ]);
        }

        $course->load(['authority', 'level', 'department', 'curricula']);

        return response()->json([
            'message' => 'Course created successfully.',
            'data' => $this->transformCourse($course),
        ], 201);
    }

    public function show(Request $request, Course $course): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $course->load(['authority', 'level', 'department', 'curricula']);

        return response()->json([
            'data' => $this->transformCourse($course),
        ]);
    }

    public function update(UpdateCourseRequest $request, Course $course): JsonResponse
    {
        $course->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $course->load(['authority', 'level', 'department', 'curricula']);

        return response()->json([
            'message' => 'Course updated successfully.',
            'data' => $this->transformCourse($course),
        ]);
    }

    public function destroy(Request $request, Course $course): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        $course->delete();

        return response()->json([
            'message' => 'Course deleted successfully.',
        ]);
    }

    public function attachCurriculum(Request $request, Course $course): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $request->validate([
            'curriculum_id' => ['required', 'string', 'exists:curricula,id'],
        ]);

        $exists = $course->curricula()->where('curriculum_id', $request->curriculum_id)->exists();

        if ($exists) {
            return response()->json([
                'message' => 'This curriculum is already linked to the course.',
            ], 422);
        }

        CourseCurriculum::create([
            'id' => (string) Str::uuid(),
            'course_id' => $course->id,
            'curriculum_id' => $request->curriculum_id,
            'is_active' => true,
        ]);

        $course->load('curricula');

        return response()->json([
            'message' => 'Curriculum linked successfully.',
            'data' => $course->curricula,
        ]);
    }

    public function detachCurriculum(Request $request, Course $course): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $request->validate([
            'curriculum_id' => ['required', 'string', 'exists:curricula,id'],
        ]);

        $course->curricula()->detach($request->curriculum_id);

        $course->load('curricula');

        return response()->json([
            'message' => 'Curriculum unlinked successfully.',
            'data' => $course->curricula,
        ]);
    }

    public function toggleCurriculum(Request $request, Course $course): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $request->validate([
            'curriculum_id' => ['required', 'string', 'exists:curricula,id'],
        ]);

        /** @var CourseCurriculum|null $pivot */
        $pivot = $course->curricula()
            ->where('curriculum_id', $request->curriculum_id)
            ->first()?->pivot;

        if (!$pivot) {
            return response()->json([
                'message' => 'Curriculum is not linked to this course.',
            ], 404);
        }

        $pivot->update([
            'is_active' => !$pivot->is_active,
        ]);

        $course->load('curricula');

        return response()->json([
            'message' => $pivot->is_active ? 'Curriculum activated.' : 'Curriculum deactivated.',
            'data' => $course->curricula,
        ]);
    }

    private function transformCourse(Course $course): array
    {
        return [
            'id' => $course->id,
            'code' => $course->code,
            'initials' => $course->initials,
            'name' => $course->name,
            'duration_months' => $course->duration_months,
            'duration_label' => $course->duration_label,
            'description' => $course->description,
            'is_active' => $course->is_active,
            'certification_authority_id' => $course->certification_authority_id,
            'certification_authority_code' => $course->authority?->code,
            'certification_authority_name' => $course->authority?->name,
            'certification_level_id' => $course->certification_level_id,
            'certification_level_code' => $course->level?->code,
            'certification_level_name' => $course->level?->name,
            'department_id' => $course->department_id,
            'department_name' => $course->department?->name,
            'curricula' => $course->curricula->map(fn ($curriculum) => [
                'id' => $curriculum->id,
                'pivot_id' => $curriculum->pivot->id,
                'code' => $curriculum->code,
                'name' => $curriculum->name,
                'is_active' => $curriculum->pivot->is_active,
                'linked_at' => $curriculum->pivot->created_at,
            ])->values(),
            'created_at' => $course->created_at,
            'updated_at' => $course->updated_at,
        ];
    }

}
