<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Http\Requests\StoreCertificationLevelRequest;
use App\Http\Requests\UpdateCertificationLevelRequest;
use App\Models\CertificationLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class CertificationLevelsController extends Controller
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
            'entry_grade' => 'entry_grade',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $levels = CertificationLevel::query()
            ->with('authority')
            ->when($authorityId !== '', fn ($query) => $query->where('certification_authority_id', $authorityId))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('entry_grade', 'like', "%{$search}%")
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
            ->orderBy($sortableColumns[$sortBy] ?? 'code', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $levels->getCollection()->map(fn (CertificationLevel $level) => $this->transformLevel($level))->values(),
            'meta' => $this->paginationMeta($levels, [
                'q' => $search,
                'status' => $status,
                'certification_authority_id' => $authorityId,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreCertificationLevelRequest $request): JsonResponse
    {
        $level = CertificationLevel::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $level->load('authority');

        return response()->json([
            'message' => 'Certification level created successfully.',
            'data' => $this->transformLevel($level),
        ], 201);
    }

    public function show(Request $request, CertificationLevel $certification_level): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $certification_level->load('authority');

        return response()->json([
            'data' => $this->transformLevel($certification_level),
        ]);
    }

    public function update(UpdateCertificationLevelRequest $request, CertificationLevel $certification_level): JsonResponse
    {
        $certification_level->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $certification_level->load('authority');

        return response()->json([
            'message' => 'Certification level updated successfully.',
            'data' => $this->transformLevel($certification_level),
        ]);
    }

    public function destroy(Request $request, CertificationLevel $certification_level): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        $certification_level->delete();

        return response()->json([
            'message' => 'Certification level deleted successfully.',
        ]);
    }

    private function transformLevel(CertificationLevel $level): array
    {
        return [
            'id' => $level->id,
            'certification_authority_id' => $level->certification_authority_id,
            'certification_authority_code' => $level->authority?->code,
            'certification_authority_name' => $level->authority?->name,
            'code' => $level->code,
            'name' => $level->name,
            'entry_grade' => $level->entry_grade,
            'description' => $level->description,
            'is_active' => $level->is_active,
            'created_at' => $level->created_at,
            'updated_at' => $level->updated_at,
        ];
    }

}
