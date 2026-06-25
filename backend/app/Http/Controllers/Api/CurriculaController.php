<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Http\Requests\StoreCurriculumRequest;
use App\Http\Requests\UpdateCurriculumRequest;
use App\Models\Curriculum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class CurriculaController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $authorityId = (string) $request->string('certification_authority_id', '');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'code' => 'code',
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $curricula = Curriculum::query()
            ->with('authority')
            ->when($authorityId !== '', fn ($query) => $query->where('certification_authority_id', $authorityId))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('authority', function ($authorityQuery) use ($search) {
                            $authorityQuery
                                ->where('code', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $curricula->getCollection()->map(fn (Curriculum $curriculum) => $this->transformCurriculum($curriculum))->values(),
            'meta' => $this->paginationMeta($curricula, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreCurriculumRequest $request): JsonResponse
    {
        $curriculum = Curriculum::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $curriculum->load('authority');

        return response()->json([
            'message' => 'Curriculum created successfully.',
            'data' => $this->transformCurriculum($curriculum),
        ], 201);
    }

    public function show(Request $request, Curriculum $curriculum): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $curriculum->load('authority');

        return response()->json([
            'data' => $this->transformCurriculum($curriculum),
        ]);
    }

    public function update(UpdateCurriculumRequest $request, Curriculum $curriculum): JsonResponse
    {
        $curriculum->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $curriculum->load('authority');

        return response()->json([
            'message' => 'Curriculum updated successfully.',
            'data' => $this->transformCurriculum($curriculum),
        ]);
    }

    public function destroy(Request $request, Curriculum $curriculum): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        $curriculum->delete();

        return response()->json([
            'message' => 'Curriculum deleted successfully.',
        ]);
    }

    private function transformCurriculum(Curriculum $curriculum): array
    {
        return [
            'id' => $curriculum->id,
            'certification_authority_id' => $curriculum->certification_authority_id,
            'certification_authority_code' => $curriculum->authority?->code,
            'certification_authority_name' => $curriculum->authority?->name,
            'code' => $curriculum->code,
            'name' => $curriculum->name,
            'description' => $curriculum->description,
            'is_active' => $curriculum->is_active,
            'created_at' => $curriculum->created_at,
            'updated_at' => $curriculum->updated_at,
        ];
    }


}
