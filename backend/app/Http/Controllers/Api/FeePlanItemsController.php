<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeePlanItemRequest;
use App\Http\Requests\UpdateFeePlanItemRequest;
use App\Models\FeePlanItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeePlanItemsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $feePlanId = (string) $request->string('fee_plan_id', '');
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

        $items = FeePlanItem::query()
            ->with('plan')
            ->when($feePlanId !== '', fn ($query) => $query->where('fee_plan_id', $feePlanId))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('plan', function ($planQuery) use ($search) {
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
            'data' => $items->getCollection()->map(fn (FeePlanItem $item) => $this->transformItem($item))->values(),
            'meta' => $this->paginationMeta($items, [
                'fee_plan_id' => $feePlanId,
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreFeePlanItemRequest $request): JsonResponse
    {
        $item = FeePlanItem::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $item->load('plan');

        return response()->json([
            'message' => 'Fee component created successfully.',
            'data' => $this->transformItem($item),
        ], 201);
    }

    public function show(Request $request, FeePlanItem $fee_plan_item): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $fee_plan_item->load('plan');

        return response()->json([
            'data' => $this->transformItem($fee_plan_item),
        ]);
    }

    public function update(UpdateFeePlanItemRequest $request, FeePlanItem $fee_plan_item): JsonResponse
    {
        $fee_plan_item->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $fee_plan_item->load('plan');

        return response()->json([
            'message' => 'Fee component updated successfully.',
            'data' => $this->transformItem($fee_plan_item),
        ]);
    }

    public function destroy(Request $request, FeePlanItem $fee_plan_item): JsonResponse
    {
        abort_unless($request->user()?->can('finance.delete'), 403);

        $fee_plan_item->delete();

        return response()->json([
            'message' => 'Fee component deleted successfully.',
        ]);
    }

    private function transformItem(FeePlanItem $item): array
    {
        return [
            'id' => $item->id,
            'fee_plan_id' => $item->fee_plan_id,
            'fee_plan_code' => $item->plan?->code,
            'fee_plan_name' => $item->plan?->name,
            'name' => $item->name,
            'amount' => (float) $item->amount,
            'description' => $item->description,
            'is_active' => $item->is_active,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
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
