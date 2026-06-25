<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CourseCurriculum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class CourseCurriculaController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $courseId = (string) $request->string('course_id', '');
        $curriculumId = (string) $request->string('curriculum_id', '');
        $perPage = max(1, min((int) $request->integer('per_page', 50), 200));

        $mappings = CourseCurriculum::query()
            ->with(['course:id,code,name,initials', 'curriculum:id,code,name'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->whereHas('course', fn ($cq) => $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%")
                            ->orWhere('initials', 'like', "%{$search}%"))
                        ->orWhereHas('curriculum', fn ($curQ) => $curQ->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%"));
                });
            })
            ->when($courseId !== '', fn ($q) => $q->where('course_id', $courseId))
            ->when($curriculumId !== '', fn ($q) => $q->where('curriculum_id', $curriculumId))
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $mappings->getCollection()->map(fn (CourseCurriculum $m) => $this->transform($m))->values(),
            'meta' => $this->paginationMeta($mappings, [
                'q' => $search,
                'course_id' => $courseId,
                'curriculum_id' => $curriculumId,
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $validated = $request->validate([
            'course_id' => ['required', 'string', 'exists:courses,id'],
            'curriculum_id' => ['required', 'string', 'exists:curricula,id'],
        ]);

        $exists = CourseCurriculum::where('course_id', $validated['course_id'])
            ->where('curriculum_id', $validated['curriculum_id'])
            ->exists();

        if ($exists) {
            return response()->json([ 'message' => 'This curriculum is already mapped to this course.'], 409);
        }

        $mapping = CourseCurriculum::create([
            'course_id' => $validated['course_id'],
            'curriculum_id' => $validated['curriculum_id'],
            'is_active' => true,
        ]);

        $mapping->load(['course:id,code,name,initials', 'curriculum:id,code,name']);

        return response()->json([
            'message' => 'Curriculum mapped to course successfully.',
            'data' => $this->transform($mapping),
        ], 201);
    }

    public function update(Request $request, CourseCurriculum $courseCurriculum): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $courseCurriculum->update(['is_active' => $validated['is_active']]);
        $courseCurriculum->load(['course:id,code,name,initials', 'curriculum:id,code,name']);

        return response()->json([
            'message' => $validated['is_active'] ? 'Mapping activated.' : 'Mapping deactivated.',
            'data' => $this->transform($courseCurriculum),
        ]);
    }

    public function destroy(Request $request, CourseCurriculum $courseCurriculum): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        $courseCurriculum->delete();

        return response()->json([ 'message' => 'Curriculum mapping removed.']);
    }

    private function transform(CourseCurriculum $mapping): array
    {
        return [
            'id' => $mapping->id,
            'course_id' => $mapping->course_id,
            'course_code' => $mapping->course?->code,
            'course_name' => $mapping->course?->name,
            'course_initials' => $mapping->course?->initials,
            'curriculum_id' => $mapping->curriculum_id,
            'curriculum_code' => $mapping->curriculum?->code,
            'curriculum_name' => $mapping->curriculum?->name,
            'is_active' => (bool) $mapping->is_active,
            'created_at' => $mapping->created_at,
            'updated_at' => $mapping->updated_at,
        ];
    }

}
