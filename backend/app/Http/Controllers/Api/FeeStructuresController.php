<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeeStructureRequest;
use App\Http\Requests\UpdateFeeStructureRequest;
use App\Models\CurriculumFeeStructure;
use App\Models\FeeStructure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class FeeStructuresController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'code' => 'code',
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $templates = FeeStructure::query()
            ->withCount('items')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'created_at', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $templates->getCollection()->map(fn (FeeStructure $template) => $this->transform($template))->values(),
            'meta' => $this->paginationMeta($templates, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreFeeStructureRequest $request): JsonResponse
    {
        $template = FeeStructure::create([
            'code' => $request->input('code'),
            'name' => $request->input('name'),
            'type' => $request->input('type', 'fees'),
            'description' => $request->input('description'),
            'is_active' => $request->boolean('is_active', true),
            'is_issued' => false,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Fee structure created successfully.',
            'data' => $this->transform($template),
        ], 201);
    }

    public function show(Request $request, FeeStructure $fee_structure): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $fee_structure->loadCount('items');

        return response()->json([
            'data' => $this->transform($fee_structure),
        ]);
    }

    public function update(UpdateFeeStructureRequest $request, FeeStructure $fee_structure): JsonResponse
    {
        if ($this->isLocked($fee_structure)) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee structure has already been assigned or issued. It cannot be modified.',
            ], 422);
        }

        $fee_structure->update([
            ...$request->validated(),
            'updated_by' => $request->user()?->id,
        ]);

        $fee_structure->loadCount('items');

        return response()->json([
            'message' => 'Fee structure updated successfully.',
            'data' => $this->transform($fee_structure),
        ]);
    }

    public function destroy(Request $request, FeeStructure $fee_structure): JsonResponse
    {
        abort_unless($request->user()?->can('finance.delete'), 403);

        if ($this->isLocked($fee_structure)) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee structure has already been assigned or issued. It cannot be deleted.',
            ], 422);
        }

        $fee_structure->delete();

        return response()->json([
            'message' => 'Fee structure deleted successfully.',
        ]);
    }

    private function transform(FeeStructure $template): array
    {
        $isAssigned = $this->isAssigned($template);
        $isLocked = $isAssigned || (bool) $template->is_issued;

        return [
            'id' => $template->id,
            'code' => $template->code,
            'name' => $template->name,
            'type' => $template->type,
            'description' => $template->description,
            'is_active' => $template->is_active,
            'is_issued' => $template->is_issued,
            'is_assigned' => $isAssigned,
            'is_locked' => $isLocked,
            'lock_reason' => $isLocked ? ($template->is_issued ? 'Issued' : 'Assigned to course') : null,
            'items_count' => (int) ($template->items_count ?? $template->items()->count()),
            'total_amount' => (float) $template->items()->sum('amount'),
            'created_at' => $template->created_at,
            'updated_at' => $template->updated_at,
        ];
    }

    private function isAssigned(FeeStructure $template): bool
    {
        return CurriculumFeeStructure::query()
            ->where('fee_structure_id', $template->id)
            ->exists();
    }

    private function isLocked(FeeStructure $template): bool
    {
        return (bool) $template->is_issued || $this->isAssigned($template);
    }


}
