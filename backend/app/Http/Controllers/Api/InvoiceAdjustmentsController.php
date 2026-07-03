<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeTemplate;
use App\Models\Student;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InvoiceAdjustmentsController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.create'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'string', 'exists:students,id'],
            'fee_template_id' => ['required', 'string', 'exists:fee_templates,id'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $student = Student::findOrFail($validated['student_id']);
        $feeTemplate = FeeTemplate::with('activeItems')->findOrFail($validated['fee_template_id']);

        $amount = $validated['amount'] ?? (float) $feeTemplate->activeItems->sum('amount');

        try {
            $invoice = $this->billingService->createManualInvoiceAdjustment(
                $student,
                $feeTemplate,
                $amount,
                $validated['description'] ?? null,
                $request->user()?->id,
            );
        } catch (ValidationException $e) {
            return response()->json([
                'status_code' => 422,
                'message' => 'Failed to create invoice adjustment.',
                'errors' => $e->errors(),
            ], 422);
        }

        $invoice->load(['student.user', 'academicSession', 'items']);

        return response()->json([
            'status_code' => 201,
            'message' => 'Invoice adjustment created successfully.',
            'data' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'student_name' => $invoice->student?->user ? trim(collect([
                    $invoice->student->user->first_name,
                    $invoice->student->user->middle_name,
                    $invoice->student->user->last_name,
                ])->filter()->implode(' ')) : '-',
                'amount' => (float) $invoice->amount_due,
                'status' => $invoice->status,
            ],
        ], 201);
    }
    public function storeCharge(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.create'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'string', 'exists:students,id'],
            'charge_type' => ['required', 'string', 'in:penalty'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $student = Student::findOrFail($validated['student_id']);

        try {
            $invoice = $this->billingService->createStandaloneChargeInvoice(
                $student,
                (float) $validated['amount'],
                $validated['charge_type'],
                $validated['description'] ?? null,
                $request->user()?->id,
            );
        } catch (ValidationException $e) {
            return response()->json([
                'status_code' => 422,
                'message' => 'Failed to create charge invoice.',
                'errors' => $e->errors(),
            ], 422);
        }

        $invoice->load(['student.user', 'academicSession', 'items']);

        return response()->json([
            'status_code' => 201,
            'message' => 'Penalty invoice created successfully.',
            'data' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'invoice_type' => $invoice->invoice_type,
                'student_id' => $invoice->student_id,
                'amount' => (float) $invoice->amount_due,
                'status' => $invoice->status,
            ],
        ], 201);
    }
}
