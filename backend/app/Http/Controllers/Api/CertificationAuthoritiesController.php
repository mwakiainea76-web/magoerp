<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Http\Requests\StoreCertificationAuthorityRequest;
use App\Http\Requests\UpdateCertificationAuthorityRequest;
use App\Models\CertificationAuthority;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class CertificationAuthoritiesController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'code' => 'code',
            'name' => 'name',
            'levels_count' => 'levels_count',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $authorities = CertificationAuthority::query()
            ->withCount('levels')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $authorities->getCollection()->map(fn (CertificationAuthority $authority) => $this->transformAuthority($authority))->values(),
            'meta' => $this->paginationMeta($authorities, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreCertificationAuthorityRequest $request): JsonResponse
    {
        $authority = CertificationAuthority::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $authority->loadCount('levels');

        return response()->json([
            'message' => 'Certification authority created successfully.',
            'data' => $this->transformAuthority($authority),
        ], 201);
    }

    public function show(Request $request, CertificationAuthority $certification_authority): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $certification_authority->load(['levels' => fn ($query) => $query->orderBy('code')->orderBy('name')])
            ->loadCount('levels');

        return response()->json([
            'data' => [
                ...$this->transformAuthority($certification_authority),
                'levels' => $certification_authority->levels->map(fn ($level) => [
                    'id' => $level->id,
                    'code' => $level->code,
                    'name' => $level->name,
                    'entry_grade' => $level->entry_grade,
                    'description' => $level->description,
                    'is_active' => $level->is_active,
                ])->values(),
            ],
        ]);
    }

    public function update(UpdateCertificationAuthorityRequest $request, CertificationAuthority $certification_authority): JsonResponse
    {
        $certification_authority->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $certification_authority->loadCount('levels');

        return response()->json([
            'message' => 'Certification authority updated successfully.',
            'data' => $this->transformAuthority($certification_authority),
        ]);
    }

    public function destroy(Request $request, CertificationAuthority $certification_authority): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        if ($certification_authority->levels()->exists()) {
            return response()->json([
                'message' => 'Remove certification levels from this authority before deleting it.',
            ], 422);
        }

        $certification_authority->delete();

        return response()->json([
            'message' => 'Certification authority deleted successfully.',
        ]);
    }

    private function transformAuthority(CertificationAuthority $authority): array
    {
        return [
            'id' => $authority->id,
            'code' => $authority->code,
            'name' => $authority->name,
            'description' => $authority->description,
            'is_active' => $authority->is_active,
            'levels_count' => $authority->levels_count ?? 0,
            'created_at' => $authority->created_at,
            'updated_at' => $authority->updated_at,
        ];
    }

}
