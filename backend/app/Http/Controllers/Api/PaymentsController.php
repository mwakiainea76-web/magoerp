<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
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
            ->with(['student.user', 'allocations'])
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
            ->when($academicSessionId !== '', fn ($q) => $q->whereHas('allocations.invoice', fn ($iq) => $iq->where('academic_session_id', $academicSessionId)))
            ->when($academicYearId !== '' && $academicSessionId === '', fn ($q) => $q->whereHas('allocations.invoice.academicSession', fn ($sq) => $sq->where('academic_year_id', $academicYearId)))
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

        $payment->load(['student.user']);

        return response()->json([
            'status_code' => 201,
            'message' => 'Payment recorded successfully.',
            'data' => $this->transform($payment),
        ], 201);
    }

    private function transform(Payment $payment): array
    {
        $allocated = (float) $payment->allocations->sum('amount');
        return [
            'id' => $payment->id,
            'student_id' => $payment->student_id,
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
