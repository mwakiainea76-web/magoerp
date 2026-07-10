<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\Invoice;
use App\Models\InvoicePaymentAllocation;
use App\Models\Payment;
use App\Models\Student;
use App\Models\StudentLedgerEntry;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PaymentsController extends Controller
{
    use PaginationMeta;

    public function __construct(
        protected PaymentService $paymentService
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $admissionNumber = trim((string) $request->string('admission_number', ''));
        $departmentId = (string) $request->string('department_id', '');
        $courseId = (string) $request->string('course_id', '');
        $academicYearId = (string) $request->string('academic_year_id', '');
        $academicSessionId = (string) $request->string('academic_session_id', '');
        $dateFrom = (string) $request->string('date_from', '');
        $dateTo = (string) $request->string('date_to', '');

        $payments = Payment::query()
            ->with(['student.user', 'academicSession', 'allocations'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->whereHas('student', function ($sq) use ($search) {
                        $sq->where('admission_number', 'like', "%{$search}%");
                    })->orWhereHas('student.user', function ($uq) use ($search) {
                        $uq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    })->orWhere('reference', 'like', "%{$search}%");
                });
            })
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($admissionNumber !== '', fn ($q) => $q->whereHas('student', fn ($sq) => $sq->where('admission_number', 'like', "%{$admissionNumber}%")))
            ->when($departmentId !== '', fn ($q) => $q->whereHas('allocations.invoice', fn ($invoice) => $invoice->where('department_id', $departmentId)))
            ->when($courseId !== '', fn ($q) => $q->whereHas('allocations.invoice', fn ($invoice) => $invoice->where('course_id', $courseId)))
            ->when($academicSessionId !== '', fn ($q) => $q->where('academic_session_id', $academicSessionId))
            ->when($academicYearId !== '' && $academicSessionId === '', fn ($q) => $q->whereHas('academicSession', fn ($sq) => $sq->where('academic_year_id', $academicYearId)))
            ->when($dateFrom !== '', fn ($q) => $q->whereDate('payment_date', '>=', $dateFrom))
            ->when($dateTo !== '', fn ($q) => $q->whereDate('payment_date', '<=', $dateTo))
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'status_code' => 200,
            'data' => $payments->getCollection()->map(fn (Payment $p) => $this->transform($p))->values(),
            'meta' => $this->paginationMeta($payments, [
                'q' => $search,
            ]),
        ], 200);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.create'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'string', 'exists:students,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', 'string', 'max:50'],
            'reference' => ['nullable', 'string', 'max:100'],
            'payment_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $student = Student::findOrFail($validated['student_id']);

        try {
            $payment = $this->paymentService->recordStudentPayment(
                $student,
                (float) $validated['amount'],
                $validated['method'],
                (string) $request->user()->id,
                $validated['reference'] ?? null,
                $validated['payment_date'] ?? null,
                $validated['notes'] ?? null,
            );
        } catch (ValidationException $e) {
            return response()->json([
                'status_code' => 422,
                'message' => 'Failed to record payment.',
                'errors' => $e->errors(),
            ], 422);
        }

        $payment->load(['student.user', 'academicSession', 'allocations']);

        return response()->json([
            'status_code' => 201,
            'message' => 'Payment recorded successfully.',
            'data' => $this->transform($payment),
        ], 201);
    }

    /**
     * Reverse a completed payment.
     */
    public function reverse(Request $request, Payment $payment): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $payment = $this->paymentService->reversePayment(
                $payment,
                $validated['reason'],
                (string) $request->user()->id,
            );
        } catch (ValidationException $e) {
            return response()->json([
                'status_code' => 422,
                'message' => 'Failed to reverse payment.',
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'status_code' => 200,
            'message' => 'Payment reversed successfully.',
            'data' => $this->transform($payment),
        ]);
    }

    /**
     * Preview what would happen if a payment is reversed.
     * Shows which invoices would reopen and by how much.
     */
    public function reversalPreview(Request $request, Payment $payment): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        if ($payment->status !== 'completed') {
            return response()->json([
                'status_code' => 422,
                'message' => 'Payment is not in a reversible state.',
            ], 422);
        }

        $allocations = InvoicePaymentAllocation::where('payment_id', $payment->id)
            ->with('invoice')
            ->get();

        $invoices = $allocations->map(fn ($a) => [
            'invoice_id' => $a->invoice_id,
            'invoice_number' => $a->invoice?->invoice_number,
            'current_balance' => (float) ($a->invoice?->amount_due ?? 0),
            'reversal_amount' => (float) $a->amount,
            'new_balance' => (float) (($a->invoice?->amount_due ?? 0) + (float) $a->amount),
        ]);

        $unallocatedCredit = (float) StudentLedgerEntry::where('payment_id', $payment->id)
            ->whereNull('invoice_id')
            ->where('type', 'payment')
            ->where('credit', '>', 0)
            ->sum('credit');

        return response()->json([
            'data' => [
                'payment' => [
                    'id' => $payment->id,
                    'amount' => (float) $payment->amount,
                    'method' => $payment->method,
                    'reference' => $payment->reference,
                    'payment_date' => $payment->payment_date?->format('Y-m-d'),
                ],
                'affected_invoices' => $invoices,
                'unallocated_credit' => round($unallocatedCredit, 2),
                'total_reversal' => round((float) $payment->amount, 2),
            ],
        ]);
    }

    /**
     * Preview FIFO allocation — shows how a given payment amount would
     * be distributed across outstanding invoices.
     */
    public function fifoPreview(Request $request, Student $student): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $amount = (float) $validated['amount'];
        $remaining = $amount;
        $allocations = [];

        $invoices = Invoice::where('student_id', $student->id)
            ->whereIn('status', ['issued', 'partial'])
            ->orderBy('issue_date')
            ->orderBy('created_at')
            ->get();

        foreach ($invoices as $invoice) {
            if ($remaining <= 0) break;

            $paidAmount = (float) InvoicePaymentAllocation::query()
                ->where('invoice_id', $invoice->id)
                ->whereHas('payment', fn ($query) => $query->where('status', 'completed'))
                ->sum('amount');
            $outstanding = (float) $invoice->amount_due - $paidAmount;
            $outstanding = max(0, $outstanding);

            if ($outstanding <= 0) continue;

            $alloc = min($remaining, $outstanding);
            $allocations[] = [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'outstanding' => round($outstanding, 2),
                'allocation' => round($alloc, 2),
                'status' => $invoice->status,
            ];
            $remaining -= $alloc;
        }

        return response()->json([
            'data' => [
                'total_amount' => $amount,
                'allocated' => round($amount - $remaining, 2),
                'unallocated_credit' => round($remaining, 2),
                'allocations' => $allocations,
            ],
        ]);
    }

    private function transform(Payment $payment): array
    {
        $allocated = $payment->status === 'completed'
            ? (float) $payment->allocations->sum('amount')
            : 0.0;
        return [
            'id' => $payment->id,
            'student_id' => $payment->student_id,
            'academic_session_id' => $payment->academic_session_id,
            'academic_session_name' => $payment->academicSession?->name,
            'student_name' => $this->studentName($payment->student),
            'admission_number' => $payment->student?->admission_number,
            'amount' => (float) $payment->amount,
            'allocated_total' => $allocated,
            'unallocated_amount' => max(0, (float) $payment->amount - $allocated),
            'payment_date' => $payment->payment_date?->format('Y-m-d'),
            'method' => $payment->method,
            'reference' => $payment->reference,
            'status' => $payment->status,
            'notes' => $payment->notes,
        ];
    }

    private function studentName($student): string
    {
        if (!$student) return '-';
        return trim(collect([$student->user->first_name, $student->user->middle_name, $student->user->last_name])->filter()->implode(' '));
    }
}
