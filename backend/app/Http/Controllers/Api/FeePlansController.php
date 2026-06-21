<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeePlanRequest;
use App\Http\Requests\UpdateFeePlanRequest;
use App\Models\FeePlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeePlansController extends Controller
{
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

        $plans = FeePlan::query()
            ->withCount('items')
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
            ->orderBy($sortableColumns[$sortBy] ?? 'created_at', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $plans->getCollection()->map(fn (FeePlan $plan) => $this->transformPlan($plan))->values(),
            'meta' => $this->paginationMeta($plans, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreFeePlanRequest $request): JsonResponse
    {
        $plan = FeePlan::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Fee plan created successfully.',
            'data' => $this->transformPlan($plan),
        ], 201);
    }

    public function show(Request $request, FeePlan $fee_plan): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $fee_plan->loadCount('items');

        return response()->json([
            'data' => $this->transformPlan($fee_plan),
        ]);
    }

    public function update(UpdateFeePlanRequest $request, FeePlan $fee_plan): JsonResponse
    {
        $fee_plan->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $fee_plan->loadCount('items');

        return response()->json([
            'message' => 'Fee plan updated successfully.',
            'data' => $this->transformPlan($fee_plan),
        ]);
    }

    public function destroy(Request $request, FeePlan $fee_plan): JsonResponse
    {
        abort_unless($request->user()?->can('finance.delete'), 403);

        $fee_plan->delete();

        return response()->json([
            'message' => 'Fee plan deleted successfully.',
        ]);
    }

    private function transformPlan(FeePlan $plan): array
    {
        return [
            'id' => $plan->id,
            'code' => $plan->code,
            'name' => $plan->name,
            'description' => $plan->description,
            'is_active' => $plan->is_active,
            'items_count' => (int) ($plan->items_count ?? $plan->items()->count()),
            'total_amount' => (float) $plan->items()->sum('amount'),
            'created_at' => $plan->created_at,
            'updated_at' => $plan->updated_at,
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
