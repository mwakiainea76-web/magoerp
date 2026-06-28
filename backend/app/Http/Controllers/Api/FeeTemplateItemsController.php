<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeeTemplateItemRequest;
use App\Http\Requests\UpdateFeeTemplateItemRequest;
use App\Models\CurriculumFeeAssignment;
use App\Models\FeeTemplate;
use App\Models\FeeTemplateItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class FeeTemplateItemsController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $templateId = (string) $request->string('fee_template_id', '');
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

        $items = FeeTemplateItem::query()
            ->with('feeTemplate')
            ->when($templateId !== '', fn ($query) => $query->where('fee_template_id', $templateId))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('feeTemplate', function ($planQuery) use ($search) {
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
            'data' => $items->getCollection()->map(fn (FeeTemplateItem $item) => $this->transform($item))->values(),
            'meta' => $this->paginationMeta($items, [
                'fee_template_id' => $templateId,
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreFeeTemplateItemRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $template = FeeTemplate::find($validated['fee_template_id']);

        if ($this->isTemplateLocked($template)) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee template has already been assigned or issued. Its components cannot be modified.',
            ], 422);
        }

        $item = FeeTemplateItem::create([
            ...$validated,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $item->load('feeTemplate');

        return response()->json([
            'message' => 'Fee component created successfully.',
            'data' => $this->transform($item),
        ], 201);
    }

    public function show(Request $request, FeeTemplateItem $fee_template_item): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $fee_template_item->load('feeTemplate');

        return response()->json([
            'data' => $this->transform($fee_template_item),
        ]);
    }

    public function update(UpdateFeeTemplateItemRequest $request, FeeTemplateItem $fee_template_item): JsonResponse
    {
        $fee_template_item->load('feeTemplate');

        if ($this->isTemplateLocked($fee_template_item->feeTemplate)) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee template has already been assigned or issued. Its components cannot be modified.',
            ], 422);
        }

        $validated = $request->validated();

        $fee_template_item->update([
            ...$validated,
            'updated_by' => $request->user()->id,
        ]);

        $fee_template_item->load('feeTemplate');

        return response()->json([
            'message' => 'Fee component updated successfully.',
            'data' => $this->transform($fee_template_item),
        ]);
    }

    public function destroy(Request $request, FeeTemplateItem $fee_template_item): JsonResponse
    {
        abort_unless($request->user()?->can('finance.delete'), 403);

        $fee_template_item->load('feeTemplate');

        if ($this->isTemplateLocked($fee_template_item->feeTemplate)) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee template has already been assigned or issued. Its components cannot be deleted.',
            ], 422);
        }

        $fee_template_item->delete();

        return response()->json([
            'message' => 'Fee component deleted successfully.',
        ]);
    }

    private function transform(FeeTemplateItem $item): array
    {
        $isAssigned = $this->isTemplateAssigned($item->feeTemplate);
        $isLocked = $this->isTemplateLocked($item->feeTemplate);

        return [
            'id' => $item->id,
            'fee_template_id' => $item->fee_template_id,
            'fee_template_code' => $item->feeTemplate?->code,
            'fee_template_name' => $item->feeTemplate?->name,
            'name' => $item->name,
            'amount' => (float) $item->amount,
            'description' => $item->description,
            'is_active' => $item->is_active,
            'is_issued' => $item->feeTemplate?->is_issued ?? false,
            'is_assigned' => $isAssigned,
            'is_locked' => $isLocked,
            'lock_reason' => $isLocked ? (($item->feeTemplate?->is_issued ?? false) ? 'Issued' : 'Assigned to course') : null,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ];
    }

    private function isTemplateAssigned(?FeeTemplate $template): bool
    {
        if (!$template) {
            return false;
        }

        return CurriculumFeeAssignment::query()
            ->where('fee_template_id', $template->id)
            ->exists();
    }

    private function isTemplateLocked(?FeeTemplate $template): bool
    {
        if (!$template) {
            return false;
        }

        return (bool) $template->is_issued || $this->isTemplateAssigned($template);
    }


}
