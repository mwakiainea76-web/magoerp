<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Http\Requests\StoreUnitRequest;
use App\Http\Requests\UpdateUnitRequest;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UnitsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $courseCurriculumId = (string) $request->string('course_curriculum_id', '');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'code' => 'code',
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $units = Unit::query()
            ->with('courseCurriculum.course.authority', 'courseCurriculum.course.level', 'courseCurriculum.curriculum')
            ->when($courseCurriculumId !== '', fn ($q) => $q->where('course_curriculum_id', $courseCurriculumId))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('courseCurriculum.course', function ($courseQuery) use ($search) {
                            $courseQuery
                                ->where('code', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $units->getCollection()->map(fn (Unit $unit) => $this->transformUnit($unit))->values(),
            'meta' => $this->paginationMeta($units, [
                'q' => $search,
                'status' => $status,
                'course_curriculum_id' => $courseCurriculumId,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreUnitRequest $request): JsonResponse
    {
        $data = $this->resolveModuleProgress($request->validated());

        $unit = Unit::create([
            ...$data,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $unit->load('courseCurriculum.course.authority', 'courseCurriculum.course.level', 'courseCurriculum.curriculum');

        return response()->json([
            'message' => 'Unit created successfully.',
            'data' => $this->transformUnit($unit),
        ], 201);
    }

    public function show(Request $request, Unit $unit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $unit->load('courseCurriculum.course.authority', 'courseCurriculum.course.level', 'courseCurriculum.curriculum');

        return response()->json([
            'data' => $this->transformUnit($unit),
        ]);
    }

    public function update(UpdateUnitRequest $request, Unit $unit): JsonResponse
    {
        $data = $this->resolveModuleProgress($request->validated());

        $unit->update([
            ...$data,
            'updated_by' => $request->user()->id,
        ]);

        $unit->load('courseCurriculum.course.authority', 'courseCurriculum.course.level', 'courseCurriculum.curriculum');

        return response()->json([
            'message' => 'Unit updated successfully.',
            'data' => $this->transformUnit($unit),
        ]);
    }

    public function destroy(Request $request, Unit $unit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        $unit->delete();

        return response()->json([
            'message' => 'Unit deleted successfully.',
        ]);
    }

    private function resolveModuleProgress(array $data): array
    {
        if (!empty($data['modules_taught'])) {
            $module = (int) $data['modules_taught'];
            $data['year_of_study'] = (int) floor(($module - 1) / 3) + 1;
            $data['session_number'] = (($module - 1) % 3) + 1;
        }

        return $data;
    }

    private function transformUnit(Unit $unit): array
    {
        $courseCurriculum = $unit->courseCurriculum;

        return [
            'id' => $unit->id,
            'course_curriculum_id' => $unit->course_curriculum_id,
            'course_id' => $courseCurriculum?->course_id,
            'course_code' => $courseCurriculum?->course?->code,
            'course_name' => $courseCurriculum?->course?->name,
            'course_initials' => $courseCurriculum?->course?->initials,
            'curriculum_id' => $courseCurriculum?->curriculum_id,
            'curriculum_code' => $courseCurriculum?->curriculum?->code,
            'curriculum_name' => $courseCurriculum?->curriculum?->name,
            'certification_authority_id' => $courseCurriculum?->course?->certification_authority_id,
            'certification_authority_code' => $courseCurriculum?->course?->authority?->code,
            'certification_authority_name' => $courseCurriculum?->course?->authority?->name,
            'certification_level_id' => $courseCurriculum?->course?->certification_level_id,
            'certification_level_code' => $courseCurriculum?->course?->level?->code,
            'certification_level_name' => $courseCurriculum?->course?->level?->name,
            'code' => $unit->code,
            'name' => $unit->name,
            'description' => $unit->description,
            'modules_taught' => $unit->modules_taught,
            'year_of_study' => $unit->year_of_study,
            'session_number' => $unit->session_number,
            'taught_hours' => $unit->taught_hours,
            'credit_factor' => $unit->credit_factor,
            'is_active' => $unit->is_active,
            'created_at' => $unit->created_at,
            'updated_at' => $unit->updated_at,
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