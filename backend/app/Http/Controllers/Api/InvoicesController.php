<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\CourseInvoiceTemplate;
use App\Models\Invoice;
use App\Models\InvoiceTemplate;
use App\Models\Student;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InvoicesController extends Controller
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
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'invoice_number' => 'invoice_number',
            'invoice_type' => 'invoice_type',
            'status' => 'status',
            'issue_date' => 'issue_date',
            'due_date' => 'due_date',
            'amount_due' => 'amount_due',
            'balance_due' => 'balance_due',
            'created_at' => 'created_at',
        ];

        $invoices = Invoice::query()
            ->with(['student', 'academicSession'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('student', function ($sq) use ($search) {
                        $sq->where('admission_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('student.user', function ($uq) use ($search) {
                        $uq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            })
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderBy($sortableColumns[$sortBy] ?? 'created_at', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'status_code' => 200,
            'data' => $invoices->getCollection()->map(fn (Invoice $i) => $this->transform($i))->values(),
            'meta' => $this->paginationMeta($invoices, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ], 200);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $invoice->load(['student', 'academicSession', 'items', 'adjustments', 'paymentAllocations.payment', 'ledgerTransactions']);

        return response()->json([
            'status_code' => 200,
            'data' => $this->transformFull($invoice),
        ], 200);
    }

    public function availableTemplates(Student $student): JsonResponse
    {
        abort_unless(request()->user()?->can('finance.view'), 403);

        $courseCurriculumId = $student->course_curriculum_id
            ?? $student->courseEnrolments()
                ->where('status', 'enrolled')
                ->latest()
                ->value('course_curriculum_id');

        if (!$courseCurriculumId) {
            return response()->json(['data' => []], 200);
        }

        $templates = CourseInvoiceTemplate::query()
            ->where('course_curriculum_id', $courseCurriculumId)
            ->where('is_approved', true)
            ->with(['invoiceTemplate' => function ($q) {
                $q->with(['activeItems' => function ($q) {
                    $q->where('amount', '>', 0);
                }]);
            }])
            ->get()
            ->filter(fn ($cit) => $cit->invoiceTemplate && $cit->invoiceTemplate->activeItems->isNotEmpty())
            ->values()
            ->map(fn ($cit) => [
                'id' => $cit->id,
                'invoice_template_id' => $cit->invoiceTemplate->id,
                'template_code' => $cit->invoiceTemplate->code,
                'template_name' => $cit->invoiceTemplate->name,
                'year_level' => $cit->year_level,
                'session_number' => $cit->session_number,
                'total_amount' => (float) $cit->invoiceTemplate->activeItems->sum('amount'),
            ]);

        return response()->json(['data' => $templates], 200);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.create'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'string', 'exists:students,id'],
            'invoice_template_id' => ['nullable', 'string', 'exists:invoice_templates,id'],
        ]);

        $student = Student::findOrFail($validated['student_id']);

        try {
            $invoice = $this->billingService->createInvoiceForStudent(
                $student,
                $request->user()?->id,
                null,
                $validated['invoice_template_id'] ?? null,
            );
        } catch (ValidationException $e) {
            return response()->json([
                'status_code' => 422,
                'message' => 'Failed to create invoice.',
                'errors' => $e->errors(),
            ], 422);
        }

        $invoice->load(['student', 'academicSession', 'items', 'adjustments', 'paymentAllocations.payment', 'ledgerTransactions']);

        return response()->json([
            'status_code' => 201,
            'message' => 'Invoice created successfully.',
            'data' => $this->transformFull($invoice),
        ], 201);
    }

    public function myInvoices(Request $request): JsonResponse
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['status_code' => 200, 'data' => []], 200);
        }

        $invoices = Invoice::query()
            ->where('student_id', $student->id)
            ->with(['student', 'academicSession', 'items', 'adjustments', 'paymentAllocations.payment', 'ledgerTransactions'])
            ->latest()
            ->get()
            ->map(fn (Invoice $i) => $this->transformFull($i))
            ->values();

        return response()->json(['status_code' => 200, 'data' => $invoices], 200);
    }

    public function financeSummary(Request $request): JsonResponse
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json([
                'status_code' => 200,
                'outstanding_balance' => 0,
                'total_paid' => 0,
                'next_due_date' => null,
            ], 200);
        }

        $baseQuery = Invoice::query()
            ->where('student_id', $student->id)
            ->where('status', '!=', 'cancelled');

        $outstanding = (float) (clone $baseQuery)
            ->where('balance_due', '>', 0)
            ->sum('balance_due');

        $totalPaid = (float) (clone $baseQuery)
            ->sum('paid_amount');

        $nextDueInvoice = (clone $baseQuery)
            ->where('balance_due', '>', 0)
            ->orderBy('due_date')
            ->first(['due_date']);

        return response()->json([
            'status_code' => 200,
            'outstanding_balance' => $outstanding,
            'total_paid' => $totalPaid,
            'next_due_date' => $nextDueInvoice?->due_date?->format('Y-m-d'),
        ], 200);
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
        if (!$student) return '-';
        return trim(collect([$student->user->first_name, $student->user->middle_name, $student->user->last_name])->filter()->implode(' '));
    }
}
