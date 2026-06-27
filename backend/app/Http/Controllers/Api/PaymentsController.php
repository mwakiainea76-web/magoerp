<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PaymentsController extends Controller
{
    use PaginationMeta;

    public function __construct(
        protected BillingService $billingService
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $payments = Payment::query()
            ->with(['student'])
            ->when($search !== '', function ($q) use ($search) {
                $q->whereHas('student', function ($sq) use ($search) {
                    $sq->where('admission_number', 'like', "%{$search}%");
                })->orWhereHas('student.user', function ($uq) use ($search) {
                    $uq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                });
            })
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
            $payment = $this->billingService->recordStudentPayment(
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

        $payment->load(['student']);

        return response()->json([
            'status_code' => 201,
            'message' => 'Payment recorded successfully.',
            'data' => $this->transform($payment),
        ], 201);
    }

    private function transform(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'student_id' => $payment->student_id,
            'student_name' => $this->studentName($payment->student),
            'admission_number' => $payment->student?->admission_number,
            'amount' => (float) $payment->amount,
            'allocated_total' => (float) $payment->allocated_total,
            'unallocated_amount' => (float) $payment->unallocated_amount,
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
