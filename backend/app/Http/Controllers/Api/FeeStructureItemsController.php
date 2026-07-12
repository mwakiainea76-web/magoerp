<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeeStructureItemRequest;
use App\Http\Requests\UpdateFeeStructureItemRequest;
use App\Models\CurriculumFeeStructure;
use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class FeeStructureItemsController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $templateId = (string) $request->string('fee_structure_id', '');
        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'name' => 'name',
            'amount' => 'amount',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $items = FeeStructureItem::query()
            ->with('feeStructure')
            ->when($templateId !== '', fn ($query) => $query->where('fee_structure_id', $templateId))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('feeStructure', function ($planQuery) use ($search) {
                            $planQuery
                                ->where('code', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'created_at', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $items->getCollection()->map(fn (FeeStructureItem $item) => $this->transform($item))->values(),
            'meta' => $this->paginationMeta($items, [
                'fee_structure_id' => $templateId,
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreFeeStructureItemRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $template = FeeStructure::find($validated['fee_structure_id']);

        if ($this->isStructureLocked($template)) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee structure has already been assigned or issued. Its components cannot be modified.',
            ], 422);
        }

        $item = FeeStructureItem::create([
            ...$validated,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $item->load('feeStructure');

        return response()->json([
            'message' => 'Fee component created successfully.',
            'data' => $this->transform($item),
        ], 201);
    }

    public function show(Request $request, FeeStructureItem $fee_structure_item): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $fee_structure_item->load('feeStructure');

        return response()->json([
            'data' => $this->transform($fee_structure_item),
        ]);
    }

    public function update(UpdateFeeStructureItemRequest $request, FeeStructureItem $fee_structure_item): JsonResponse
    {
        $fee_structure_item->load('feeStructure');

        if ($this->isStructureLocked($fee_structure_item->feeStructure)) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee structure has already been assigned or issued. Its components cannot be modified.',
            ], 422);
        }

        $validated = $request->validated();

        $fee_structure_item->update([
            ...$validated,
            'updated_by' => $request->user()->id,
        ]);

        $fee_structure_item->load('feeStructure');

        return response()->json([
            'message' => 'Fee component updated successfully.',
            'data' => $this->transform($fee_structure_item),
        ]);
    }

    public function destroy(Request $request, FeeStructureItem $fee_structure_item): JsonResponse
    {
        abort_unless($request->user()?->can('finance.delete'), 403);

        $fee_structure_item->load('feeStructure');

        if ($this->isStructureLocked($fee_structure_item->feeStructure)) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee structure has already been assigned or issued. Its components cannot be deleted.',
            ], 422);
        }

        $fee_structure_item->delete();

        return response()->json([
            'message' => 'Fee component deleted successfully.',
        ]);
    }

    private function transform(FeeStructureItem $item): array
    {
        $isAssigned = $this->isStructureAssigned($item->feeStructure);
        $isLocked = $this->isStructureLocked($item->feeStructure);

        return [
            'id' => $item->id,
            'fee_structure_id' => $item->fee_structure_id,
            'fee_structure_code' => $item->feeStructure?->code,
            'fee_structure_name' => $item->feeStructure?->name,
            'name' => $item->name,
            'amount' => (float) $item->amount,
            'description' => $item->description,
            'is_active' => $item->is_active,
            'is_issued' => $item->feeStructure?->is_issued ?? false,
            'is_assigned' => $isAssigned,
            'is_locked' => $isLocked,
            'lock_reason' => $isLocked ? (($item->feeStructure?->is_issued ?? false) ? 'Issued' : 'Assigned to course') : null,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ];
    }

    private function isStructureAssigned(?FeeStructure $template): bool
    {
        if (!$template) {
            return false;
        }

        return CurriculumFeeStructure::query()
            ->where('fee_structure_id', $template->id)
            ->exists();
    }

    private function isStructureLocked(?FeeStructure $template): bool
    {
        if (!$template) {
            return false;
        }

        return (bool) $template->is_issued || $this->isStructureAssigned($template);
    }


}
