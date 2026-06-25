<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PaymentsController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $payments = Payment::query()
            ->with(['student', 'invoice'])
            ->when($search !== '', function ($q) use ($search) {
                $q->whereHas('student', function ($sq) use ($search) {
                    $sq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('admission_number', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $payments->getCollection()->map(fn (Payment $p) => [
                'id' => $p->id,
                'student_id' => $p->student_id,
                'student_name' => $this->studentName($p->student),
                'admission_number' => $p->student?->admission_number,
                'invoice_number' => $p->invoice?->invoice_number,
                'amount' => (float) $p->amount,
                'payment_date' => $p->payment_date?->format('Y-m-d'),
                'method' => $p->method,
                'reference' => $p->reference,
                'status' => $p->status,
                'notes' => $p->notes,
            ])->values(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    private function studentName($student): string
    {
        if (!$student) return '—';
        return trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' '));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_id' => ['required', 'string', 'exists:invoices,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', 'string', 'max:50'],
            'reference' => ['nullable', 'string', 'max:100'],
            'payment_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $invoice = Invoice::findOrFail($validated['invoice_id']);

        try {
            $payment = $this->billingService->recordPayment(
                $invoice,
                (float) $validated['amount'],
                $validated['method'],
                $request->user()->id,
                $validated['reference'] ?? null,
                $validated['payment_date'] ?? null,
                $validated['notes'] ?? null,
            );
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Failed to record payment.',
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'data' => $payment,
        ], 201);
    }
}
