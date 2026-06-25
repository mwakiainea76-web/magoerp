<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceTemplateRequest;
use App\Http\Requests\UpdateInvoiceTemplateRequest;
use App\Models\InvoiceTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceTemplatesController extends Controller
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

        $templates = InvoiceTemplate::query()
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
            'data' => $templates->getCollection()->map(fn (InvoiceTemplate $template) => $this->transform($template))->values(),
            'meta' => $this->paginationMeta($templates, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreInvoiceTemplateRequest $request): JsonResponse
    {
        $template = InvoiceTemplate::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Invoice template created successfully.',
            'data' => $this->transform($template),
        ], 201);
    }

    public function show(Request $request, InvoiceTemplate $invoice_template): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $invoice_template->loadCount('items');

        return response()->json([
            'data' => $this->transform($invoice_template),
        ]);
    }

    public function update(UpdateInvoiceTemplateRequest $request, InvoiceTemplate $invoice_template): JsonResponse
    {
        $invoice_template->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $invoice_template->loadCount('items');

        return response()->json([
            'message' => 'Invoice template updated successfully.',
            'data' => $this->transform($invoice_template),
        ]);
    }

    public function destroy(Request $request, InvoiceTemplate $invoice_template): JsonResponse
    {
        abort_unless($request->user()?->can('finance.delete'), 403);

        $invoice_template->delete();

        return response()->json([
            'message' => 'Invoice template deleted successfully.',
        ]);
    }

    private function transform(InvoiceTemplate $template): array
    {
        return [
            'id' => $template->id,
            'code' => $template->code,
            'name' => $template->name,
            'description' => $template->description,
            'is_active' => $template->is_active,
            'items_count' => (int) ($template->items_count ?? $template->items()->count()),
            'total_amount' => (float) $template->items()->sum('amount'),
            'created_at' => $template->created_at,
            'updated_at' => $template->updated_at,
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
