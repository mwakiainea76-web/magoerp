<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Student;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RefundsController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.create'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'string', 'exists:students,id'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'invoice_id' => ['nullable', 'string', 'exists:invoices,id'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $student = Student::findOrFail($validated['student_id']);

        $invoice = isset($validated['invoice_id']) ? Invoice::find($validated['invoice_id']) : null;

        $amount = $validated['amount'] ?? $this->billingService->calculateCreditBalance($student);

        $refund = $this->billingService->processRefund(
            $student,
            (float) $amount,
            $validated['reason'] ?? null,
            $request->user()->id,
            $invoice,
        );

        $refund->load(['student.user']);

        return response()->json([
            'message' => 'Refund processed successfully.',
            'data' => [
                'id' => $refund->id,
                'student_id' => $refund->student_id,
                'student_name' => $refund->student?->full_name ?? '-',
                'admission_number' => $refund->student?->admission_number,
                'amount' => (float) $refund->amount,
                'reason' => $refund->reason,
                'status' => $refund->status,
                'processed_at' => $refund->processed_at?->format('Y-m-d H:i:s'),
            ],
        ], 201);
    }
}
