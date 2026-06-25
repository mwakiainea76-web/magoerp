<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceTemplateItemRequest;
use App\Http\Requests\UpdateInvoiceTemplateItemRequest;
use App\Models\InvoiceItem;
use App\Models\InvoiceTemplateItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceTemplateItemsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $templateId = (string) $request->string('invoice_template_id', '');
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

        $items = InvoiceTemplateItem::query()
            ->with('invoiceTemplate')
            ->when($templateId !== '', fn ($query) => $query->where('invoice_template_id', $templateId))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('invoiceTemplate', function ($planQuery) use ($search) {
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
            'data' => $items->getCollection()->map(fn (InvoiceTemplateItem $item) => $this->transform($item))->values(),
            'meta' => $this->paginationMeta($items, [
                'invoice_template_id' => $templateId,
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreInvoiceTemplateItemRequest $request): JsonResponse
    {
        $item = InvoiceTemplateItem::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $item->load('invoiceTemplate');

        return response()->json([
            'message' => 'Invoice component created successfully.',
            'data' => $this->transform($item),
        ], 201);
    }

    public function show(Request $request, InvoiceTemplateItem $invoice_template_item): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $invoice_template_item->load('invoiceTemplate');

        return response()->json([
            'data' => $this->transform($invoice_template_item),
        ]);
    }

    public function update(UpdateInvoiceTemplateItemRequest $request, InvoiceTemplateItem $invoice_template_item): JsonResponse
    {
        $validated = $request->validated();
        $newAmount = (float) $validated['amount'];
        $currentAmount = (float) $invoice_template_item->amount;
        $isAmountChanged = abs($newAmount - $currentAmount) > 0.00001;
        $isUsedInInvoice = InvoiceItem::where('invoice_template_item_id', $invoice_template_item->id)->exists();

        if ($isUsedInInvoice && $isAmountChanged) {
            return response()->json([
                'message' => 'This fee component has already been assigned to an invoice. Its amount cannot be changed.',
                'errors' => [
                    'amount' => ['This fee component has already been assigned to an invoice. Its amount cannot be changed.'],
                ],
            ], 422);
        }

        $invoice_template_item->update([
            ...$validated,
            'updated_by' => $request->user()->id,
        ]);

        $invoice_template_item->load('invoiceTemplate');

        return response()->json([
            'message' => 'Invoice component updated successfully.',
            'data' => $this->transform($invoice_template_item),
        ]);
    }

    public function destroy(Request $request, InvoiceTemplateItem $invoice_template_item): JsonResponse
    {
        abort_unless($request->user()?->can('finance.delete'), 403);

        $isUsedInInvoice = InvoiceItem::where('invoice_template_item_id', $invoice_template_item->id)->exists();

        if ($isUsedInInvoice) {
            return response()->json([
                'message' => 'This fee component has already been assigned to an invoice. It cannot be deleted.',
            ], 422);
        }

        $invoice_template_item->delete();

        return response()->json([
            'message' => 'Invoice component deleted successfully.',
        ]);
    }

    private function transform(InvoiceTemplateItem $item): array
    {
        return [
            'id' => $item->id,
            'invoice_template_id' => $item->invoice_template_id,
            'invoice_template_code' => $item->invoiceTemplate?->code,
            'invoice_template_name' => $item->invoiceTemplate?->name,
            'name' => $item->name,
            'amount' => (float) $item->amount,
            'description' => $item->description,
            'is_active' => $item->is_active,
            'is_amount_locked' => InvoiceItem::where('invoice_template_item_id', $item->id)->exists(),
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
