<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceAdjustmentsController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    public function store(Request $request, Invoice $invoice): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:discount,waiver,bursary,helb,reversal'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $adjustment = $this->billingService->applyAdjustment(
            $invoice,
            $validated['type'],
            (float) $validated['amount'],
            $request->user()->id,
            $validated['description'] ?? null,
        );

        return response()->json([
            'message' => 'Adjustment applied successfully.',
            'data' => [
                'id' => $adjustment->id,
                'type' => $adjustment->type,
                'amount' => (float) $adjustment->amount,
                'description' => $adjustment->description,
                'applied_at' => $adjustment->applied_at?->format('Y-m-d'),
            ],
        ], 201);
    }
}
