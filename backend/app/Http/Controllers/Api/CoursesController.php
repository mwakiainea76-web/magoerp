<?php

namespace App\Http\Controllers\Api;

use App\Exports\DataExportService;
use App\Exports\StreamingPdfWriter;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use App\Models\CourseCurriculum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class CoursesController extends Controller
{
    use PaginationMeta;

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search        = trim((string) $request->string('q', ''));
        $status        = (string) $request->string('status', 'all');
        $authorityId   = (string) $request->string('certification_authority_id', '');
        $levelId       = (string) $request->string('certification_level_id', '');
        $sortBy        = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage       = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'code'       => 'code',
            'name'       => 'name',
            'initials'   => 'initials',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $courses = Course::query()
            ->with(['authority', 'level', 'department', 'curricula'])
            ->when($authorityId !== '', fn ($q) => $q->where('certification_authority_id', $authorityId))
            ->when($levelId !== '',     fn ($q) => $q->where('certification_level_id', $levelId))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('code',     'like', "%{$search}%")
                        ->orWhere('initials', 'like', "%{$search}%")
                        ->orWhere('name',   'like', "%{$search}%");
                });
            })
            ->when($status === 'active',   fn ($q) => $q->where('is_active', true))
            ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $courses->getCollection()->map(fn (Course $course) => $this->transformCourse($course))->values(),
            'meta' => $this->paginationMeta($courses, [
                'q'                          => $search,
                'status'                     => $status,
                'certification_authority_id' => $authorityId,
                'certification_level_id'     => $levelId,
                'sort_by'                    => $sortBy,
                'sort_direction'             => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.create'), 403);

        $course = Course::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        if ($request->filled('curriculum_id')) {
            $request->validate([
                'curriculum_id' => ['string', 'exists:curricula,id'],
            ]);

            CourseCurriculum::create([
                'id'            => (string) Str::uuid(),
                'course_id'     => $course->id,
                'curriculum_id' => $request->curriculum_id,
                'is_active'     => true,
            ]);
        }

        $course->load(['authority', 'level', 'department', 'curricula']);

        return response()->json([
            'message' => 'Course created successfully.',
            'data'    => $this->transformCourse($course),
        ], 201);
    }

    public function show(Request $request, Course $course): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $course->load(['authority', 'level', 'department', 'curricula', 'courseCurricula.units']);

        return response()->json([
            'data' => $this->transformCourse($course),
        ]);
    }

    public function update(UpdateCourseRequest $request, Course $course): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $course->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $course->load(['authority', 'level', 'department', 'curricula']);

        return response()->json([
            'message' => 'Course updated successfully.',
            'data'    => $this->transformCourse($course),
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

        // ✅ Fixed: DB unique constraint is the real guard against race conditions.
        // Catch the violation instead of a separate exists() check.
        try {
            CourseCurriculum::create([
                'id'            => (string) Str::uuid(),
                'course_id'     => $course->id,
                'curriculum_id' => $request->curriculum_id,
                'is_active'     => true,
            ]);
        } catch (\Illuminate\Database\UniqueConstraintViolationException) {
            return response()->json([
                'message' => 'This curriculum is already linked to the course.',
            ], 422);
        }

        $course->load('curricula');

        return response()->json([
            'message' => 'Curriculum linked successfully.',
            'data'    => $this->transformCurriculum($course->curricula),
        ]);
    }

    public function detachCurriculum(Request $request, Course $course): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $request->validate([
            'curriculum_id' => ['required', 'string', 'exists:curricula,id'],
        ]);

        // ✅ Fixed: guard against silent no-op when curriculum is not linked.
        $linked = $course->curricula()->where('curriculum_id', $request->curriculum_id)->exists();

        if (! $linked) {
            return response()->json([
                'message' => 'Curriculum is not linked to this course.',
            ], 404);
        }

        $course->curricula()->detach($request->curriculum_id);

        $course->load('curricula');

        return response()->json([
            'message' => 'Curriculum unlinked successfully.',
            'data'    => $this->transformCurriculum($course->curricula),
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

        if (! $pivot) {
            return response()->json([
                'message' => 'Curriculum is not linked to this course.',
            ], 404);
        }

        // ✅ Fixed: capture new state before update so message is correct.
        $newState = ! $pivot->is_active;

        $pivot->update(['is_active' => $newState]);

        $course->load('curricula');

        return response()->json([
            'message' => $newState ? 'Curriculum activated.' : 'Curriculum deactivated.',
            'data'    => $this->transformCurriculum($course->curricula),
        ]);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    public function export(Request $request, DataExportService $exportService, StreamingPdfWriter $pdfWriter): StreamedResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $validated = $request->validate([
            'format' => ['nullable', 'in:csv,xlsx,pdf'],
            'q' => ['nullable', 'string', 'max:200'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);
        $format = $validated['format'] ?? 'csv';

        $query = Course::query()
            ->with(['authority', 'level', 'department'])
            ->when($search = trim((string) ($validated['q'] ?? '')), function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('code', 'like', "%{$search}%")
                        ->orWhere('initials', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->when(($validated['status'] ?? '') === 'active', fn ($q) => $q->where('is_active', true))
            ->when(($validated['status'] ?? '') === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderBy('name');

        $columns = [
            ['key' => 'Code', 'value' => fn (Course $c) => $c->code],
            ['key' => 'Name', 'value' => fn (Course $c) => $c->name],
            ['key' => 'Initials', 'value' => fn (Course $c) => $c->initials],
            ['key' => 'Authority', 'value' => fn (Course $c) => $c->authority?->name ?? ''],
            ['key' => 'Level', 'value' => fn (Course $c) => $c->level?->name ?? ''],
            ['key' => 'Department', 'value' => fn (Course $c) => $c->department?->name ?? ''],
            ['key' => 'Duration (months)', 'value' => fn (Course $c) => (string) ($c->duration_months ?? '')],
            ['key' => 'Status', 'value' => fn (Course $c) => $c->is_active ? 'Active' : 'Inactive'],
        ];

        return $exportService->export(
            query: $query,
            columns: $columns,
            format: $format,
            filename: 'courses',
            pdfRenderer: fn (array $headers, iterable $rows) =>
                $pdfWriter->output($headers, $rows, 'Course Catalogue'),
        );
    }

    private function transformCourse(Course $course): array
    {
        $modules = [];
        if ($course->relationLoaded('courseCurricula')) {
            foreach ($course->courseCurricula as $cc) {
                foreach ($cc->units as $unit) {
                    $moduleKey = $unit->modules_taught ?? 0;
                    if (!isset($modules[$moduleKey])) {
                        $modules[$moduleKey] = [
                            'module'         => $unit->modules_taught,
                            'year_of_study'  => $unit->year_of_study,
                            'session_number' => $unit->session_number,
                            'units'          => [],
                        ];
                    }
                    $modules[$moduleKey]['units'][] = [
                        'id'                => $unit->id,
                        'course_curriculum_id' => $unit->course_curriculum_id,
                        'code'              => $unit->code,
                        'name'              => $unit->name,
                        'taught_hours'      => $unit->taught_hours,
                        'credit_factor'     => $unit->credit_factor,
                        'is_active'         => $unit->is_active,
                    ];
                }
            }
            ksort($modules);
        }

        return [
            'id'                           => $course->id,
            'code'                         => $course->code,
            'initials'                     => $course->initials,
            'name'                         => $course->name,
            'duration_months'              => $course->duration_months,
            'duration_label'               => $course->duration_label,
            'description'                  => $course->description,
            'is_active'                    => $course->is_active,
            'certification_authority_id'   => $course->certification_authority_id,
            'certification_authority_code' => $course->authority?->code,
            'certification_authority_name' => $course->authority?->name,
            'certification_level_id'       => $course->certification_level_id,
            'certification_level_code'     => $course->level?->code,
            'certification_level_name'     => $course->level?->name,
            'department_id'                => $course->department_id,
            'department_name'              => $course->department?->name,
            'curricula'                    => $course->curricula->map(fn ($curriculum) => [
                'id'        => $curriculum->id,
                'pivot_id'  => $curriculum->pivot->id,
                'code'      => $curriculum->code,
                'name'      => $curriculum->name,
                'is_active' => $curriculum->pivot->is_active,
                'linked_at' => $curriculum->pivot->created_at,
            ])->values(),
            'units_by_module'              => array_values($modules),
            'created_at'                   => $course->created_at,
            'updated_at'                   => $course->updated_at,
        ];
    }

    private function transformCurriculum($curricula): array
    {
        return $curricula->map(fn ($curriculum) => [
            'id'        => $curriculum->id,
            'pivot_id'  => $curriculum->pivot->id,
            'code'      => $curriculum->code,
            'name'      => $curriculum->name,
            'is_active' => $curriculum->pivot->is_active,
            'linked_at' => $curriculum->pivot->created_at,
        ])->values()->all();
    }
}