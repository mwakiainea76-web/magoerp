<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Student;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InvoicesController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $invoices = Invoice::query()
            ->with(['student', 'academicSession'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('student', function ($sq) use ($search) {
                        $sq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('admission_number', 'like', "%{$search}%");
                    });
            })
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderBy($sortBy, $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $invoices->getCollection()->map(fn (Invoice $i) => $this->transform($i))->values(),
            'meta' => $this->paginationMeta($invoices, [
                'q' => $search,
                'status' => $status,
            ]),
        ]);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load(['student', 'academicSession', 'items', 'adjustments', 'paymentAllocations.payment', 'ledgerTransactions']);

        return response()->json([
            'data' => $this->transformFull($invoice),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => ['required', 'string', 'exists:students,id'],
        ]);

        $student = Student::findOrFail($validated['student_id']);

        try {
            $invoice = $this->billingService->createInvoiceForStudent($student, $request->user()?->id);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Failed to create invoice.',
                'errors' => $e->errors(),
            ], 422);
        }

        $invoice->load(['student', 'items']);

        return response()->json([
            'message' => 'Invoice created successfully.',
            'data' => $this->transformFull($invoice),
        ], 201);
    }

    public function myInvoices(Request $request): JsonResponse
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['data' => []]);
        }

        $invoices = Invoice::query()
            ->where('student_id', $student->id)
            ->with(['items', 'adjustments', 'paymentAllocations.payment', 'ledgerTransactions'])
            ->latest()
            ->get()
            ->map(fn (Invoice $i) => $this->transformFull($i))
            ->values();

        return response()->json(['data' => $invoices]);
    }

    public function financeSummary(Request $request): JsonResponse
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json([
                'outstanding_balance' => 0,
                'total_paid' => 0,
                'next_due_date' => null,
            ]);
        }

        $outstanding = (float) Invoice::query()
            ->where('student_id', $student->id)
            ->where('balance_due', '>', 0)
            ->sum('balance_due');

        $totalPaid = (float) Invoice::query()
            ->where('student_id', $student->id)
            ->sum('paid_amount');

        $nextDue = Invoice::query()
            ->where('student_id', $student->id)
            ->where('balance_due', '>', 0)
            ->orderBy('due_date')
            ->value('due_date');

        return response()->json([
            'outstanding_balance' => $outstanding,
            'total_paid' => $totalPaid,
            'next_due_date' => $nextDue?->format('Y-m-d'),
        ]);
    }

    private function transform(Invoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'student_id' => $invoice->student_id,
            'student_name' => $this->studentName($invoice->student),
            'admission_number' => $invoice->student?->admission_number,
            'session_name' => $invoice->academicSession?->name,
            'invoice_type' => $invoice->invoice_type,
            'status' => $invoice->status,
            'issue_date' => $invoice->issue_date?->format('Y-m-d'),
            'due_date' => $invoice->due_date?->format('Y-m-d'),
            'amount_due' => (float) $invoice->amount_due,
            'paid_amount' => (float) $invoice->paid_amount,
            'balance_due' => (float) $invoice->balance_due,
            'created_at' => $invoice->created_at,
        ];
    }

    private function transformFull(Invoice $invoice): array
    {
        return array_merge($this->transform($invoice), [
            'items' => $invoice->items->map(fn ($item) => [
                'id' => $item->id,
                'description' => $item->description,
                'unit_amount' => (float) $item->unit_amount,
                'quantity' => $item->quantity,
                'total_amount' => (float) $item->total_amount,
            ])->values()->all(),
            'adjustments' => $invoice->adjustments->map(fn ($adj) => [
                'id' => $adj->id,
                'type' => $adj->type,
                'amount' => (float) $adj->amount,
                'description' => $adj->description,
                'applied_at' => $adj->applied_at?->format('Y-m-d'),
            ])->values()->all(),
            'payment_allocations' => $invoice->paymentAllocations->map(fn ($pa) => [
                'id' => $pa->id,
                'amount' => (float) $pa->amount,
                'payment_date' => $pa->payment?->payment_date?->format('Y-m-d'),
                'method' => $pa->payment?->method,
                'reference' => $pa->payment?->reference,
            ])->values()->all(),
        ]);
    }

    private function studentName($student): string
    {
        if (!$student) return '—';
        return trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' '));
    }

    private function paginationMeta($paginator, array $filters): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'filters' => $filters,
        ];
    }
}
