<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeAssignmentAudit;
use App\Models\FeeTemplate;
use App\Models\Invoice;
use App\Models\Refund;
use App\Models\Student;
use App\Models\StudentFeeAdjustment;
use App\Models\StudentLedgerEntry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceReportsController extends Controller
{
    private const TYPES = [
        'debtors',
        'credits',
        'aging',
        'collections',
        'adjustments',
        'penalties',
        'refunds',
        'assignment_audits',
    ];

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);
        $filters = $this->validatedFilters($request);
        $result = $this->report($filters);

        return response()->json([
            'status_code' => 200,
            'report_type' => $filters['report_type'],
            'data' => $result['rows'],
            'summary' => $result['summary'],
            'meta' => $result['meta'],
            'columns' => $result['columns'],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);
        $filters = $this->validatedFilters($request);
        $filters['page'] = 1;
        $filters['per_page'] = 10000;
        $result = $this->report($filters);
        $columns = $result['columns'];
        $filename = "finance-{$filters['report_type']}-" . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($result, $columns) {
            $output = fopen('php://output', 'wb');
            fputcsv($output, array_values($columns));
            foreach ($result['rows'] as $row) {
                fputcsv($output, array_map(
                    fn (string $key) => $this->csvValue(data_get($row, $key)),
                    array_keys($columns)
                ));
            }
            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function validatedFilters(Request $request): array
    {
        return $request->validate([
            'report_type' => ['required', Rule::in(self::TYPES)],
            'q' => ['nullable', 'string', 'max:100'],
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'course_id' => ['nullable', 'uuid', 'exists:courses,id'],
            'academic_year_id' => ['nullable', 'uuid', 'exists:academic_years,id'],
            'academic_session_id' => ['nullable', 'uuid', 'exists:academic_sessions,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'adjustment_type' => ['nullable', Rule::in(['discount', 'waiver', 'bursary', 'helb', 'reversal', 'penalty'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:10000'],
        ]) + [
            'q' => '',
            'department_id' => '',
            'course_id' => '',
            'academic_year_id' => '',
            'academic_session_id' => '',
            'date_from' => '',
            'date_to' => '',
            'adjustment_type' => '',
            'page' => 1,
            'per_page' => 25,
        ];
    }

    private function report(array $filters): array
    {
        return match ($filters['report_type']) {
            'debtors' => $this->debtorReport($filters),
            'credits' => $this->creditReport($filters),
            'aging' => $this->agingReport($filters),
            'collections' => $this->collectionReport($filters),
            'adjustments' => $this->adjustmentReport($filters),
            'penalties' => $this->penaltyReport($filters),
            'refunds' => $this->refundReport($filters),
            'assignment_audits' => $this->assignmentAuditReport($filters),
        };
    }

    private function invoiceScope(Builder $query, array $filters, ?string $dateColumn = 'issue_date'): Builder
    {
        return $query
            ->where('status', '!=', 'cancelled')
            ->when($filters['department_id'], fn (Builder $q, $id) => $q->where('department_id', $id))
            ->when($filters['course_id'], fn (Builder $q, $id) => $q->where('course_id', $id))
            ->when($filters['academic_session_id'], fn (Builder $q, $id) => $q->where('academic_session_id', $id))
            ->when(
                $filters['academic_year_id'] && ! $filters['academic_session_id'],
                fn (Builder $q) => $q->whereHas(
                    'academicSession',
                    fn (Builder $session) => $session->where('academic_year_id', $filters['academic_year_id'])
                )
            )
            ->when($dateColumn && $filters['date_from'], fn (Builder $q, $date) => $q->whereDate($dateColumn, '>=', $date))
            ->when($dateColumn && $filters['date_to'], fn (Builder $q, $date) => $q->whereDate($dateColumn, '<=', $date))
            ->when($filters['q'], function (Builder $q, string $search) {
                $q->where(function (Builder $inner) use ($search) {
                    $inner->where('invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('student', fn (Builder $student) => $student
                            ->where('admission_number', 'like', "%{$search}%")
                            ->orWhereHas('user', fn (Builder $user) => $user
                                ->where('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")));
                });
            });
    }

    private function balanceExpression(): string
    {
        return "amount_due
            - COALESCE((SELECT SUM(amount) FROM invoice_payment_allocations WHERE invoice_id = invoices.id), 0)
            - COALESCE((SELECT SUM(CASE WHEN type IN ('discount','waiver','bursary','helb','reversal') THEN amount ELSE -amount END)
                FROM student_fee_adjustments WHERE invoice_id = invoices.id AND deleted_at IS NULL), 0)";
    }

    private function debtorReport(array $filters): array
    {
        $balance = $this->balanceExpression();
        $query = $this->invoiceScope(Invoice::query(), $filters)
            ->select('student_id')
            ->selectRaw('SUM(amount_due) AS total_invoiced')
            ->selectRaw("SUM(CASE WHEN ({$balance}) > 0 THEN ({$balance}) ELSE 0 END) AS balance")
            ->groupBy('student_id')
            ->havingRaw("SUM(CASE WHEN ({$balance}) > 0 THEN ({$balance}) ELSE 0 END) > 0")
            ->orderByDesc('balance');

        $paginator = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $students = Student::query()->with('user')->whereIn('id', $paginator->getCollection()->pluck('student_id'))->get()->keyBy('id');
        $rows = $paginator->getCollection()->map(function ($row) use ($students) {
            $student = $students->get($row->student_id);
            return [
                'student_id' => $row->student_id,
                'student_name' => $student?->full_name ?? '-',
                'admission_number' => $student?->admission_number,
                'total_invoiced' => (float) $row->total_invoiced,
                'balance' => (float) $row->balance,
            ];
        });

        return $this->result($paginator, $rows, [
            'student_name' => 'Student',
            'admission_number' => 'Admission No.',
            'total_invoiced' => 'Total Invoiced',
            'balance' => 'Outstanding',
        ], ['outstanding' => $totalOutstanding]);
    }

    private function creditReport(array $filters): array
    {
        $query = StudentLedgerEntry::query()
            ->select('student_id')
            ->selectRaw('SUM(debit - credit) AS balance')
            ->when($filters['academic_session_id'], fn (Builder $q, $id) => $q->where('academic_session_id', $id))
            ->when(
                $filters['academic_year_id'] && ! $filters['academic_session_id'],
                fn (Builder $q) => $q->whereHas('academicSession', fn (Builder $session) => $session->where('academic_year_id', $filters['academic_year_id']))
            )
            ->when($filters['date_from'], fn (Builder $q, $date) => $q->whereDate('transaction_date', '>=', $date))
            ->when($filters['date_to'], fn (Builder $q, $date) => $q->whereDate('transaction_date', '<=', $date))
            ->when($filters['department_id'] || $filters['course_id'], fn (Builder $q) => $q->whereHas(
                'invoice',
                fn (Builder $invoice) => $this->invoiceScope($invoice, $filters, null)
            ))
            ->groupBy('student_id')
            ->havingRaw('SUM(debit - credit) < 0')
            ->orderBy('balance');

        $paginator = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $students = Student::query()->with('user')->whereIn('id', $paginator->getCollection()->pluck('student_id'))->get()->keyBy('id');
        $rows = $paginator->getCollection()->map(function ($row) use ($students) {
            $student = $students->get($row->student_id);
            return [
                'student_id' => $row->student_id,
                'student_name' => $student?->full_name ?? '-',
                'admission_number' => $student?->admission_number,
                'credit' => abs((float) $row->balance),
                'signed_balance' => (float) $row->balance,
            ];
        });

        return $this->result($paginator, $rows, [
            'student_name' => 'Student',
            'admission_number' => 'Admission No.',
            'credit' => 'Available Credit',
            'signed_balance' => 'Signed Balance',
        ], ['available_credit' => $totalCredit]);
    }

    private function agingReport(array $filters): array
    {
        $balance = $this->balanceExpression();
        $query = $this->invoiceScope(Invoice::query()->with(['student.user', 'academicSession']), $filters)
            ->select('invoices.*')
            ->selectRaw("CASE WHEN ({$balance}) > 0 THEN ({$balance}) ELSE 0 END AS balance_due")
            ->whereRaw("({$balance}) > 0")
            ->orderBy('due_date');
        $paginator = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $today = now()->startOfDay();
        $rows = $paginator->getCollection()->map(function (Invoice $invoice) use ($today) {
            $days = $invoice->due_date ? (int) $invoice->due_date->diffInDays($today, false) : 0;
            $bucket = match (true) {
                $days <= 0 => 'Current',
                $days <= 30 => '1-30 days',
                $days <= 60 => '31-60 days',
                $days <= 90 => '61-90 days',
                default => '90+ days',
            };
            return [
                'invoice_number' => $invoice->invoice_number,
                'student_name' => $invoice->student?->full_name ?? '-',
                'admission_number' => $invoice->student?->admission_number,
                'session_name' => $invoice->academicSession?->name,
                'due_date' => $invoice->due_date?->format('Y-m-d'),
                'days_overdue' => max(0, $days),
                'aging_bucket' => $bucket,
                'balance' => (float) $invoice->balance_due,
            ];
        });
        $summary = $rows->groupBy('aging_bucket')->map(fn (Collection $group) => (float) $group->sum('balance'))->all();

        return $this->result($paginator, $rows, [
            'invoice_number' => 'Invoice',
            'student_name' => 'Student',
            'admission_number' => 'Admission No.',
            'session_name' => 'Session',
            'due_date' => 'Due Date',
            'days_overdue' => 'Days Overdue',
            'aging_bucket' => 'Aging Bucket',
            'balance' => 'Balance',
        ], $summary);
    }

    private function collectionReport(array $filters): array
    {
        $balance = $this->balanceExpression();
        $query = $this->invoiceScope(Invoice::query(), $filters)
            ->select('fee_template_id', 'invoice_type')
            ->selectRaw('COUNT(*) AS invoice_count')
            ->selectRaw('SUM(amount_due) AS invoiced')
            ->selectRaw('SUM(COALESCE((SELECT SUM(amount) FROM invoice_payment_allocations WHERE invoice_id = invoices.id), 0)) AS collected')
            ->selectRaw("SUM(CASE WHEN ({$balance}) > 0 THEN ({$balance}) ELSE 0 END) AS outstanding")
            ->groupBy('fee_template_id', 'invoice_type')
            ->orderByDesc('invoiced');
        $paginator = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $templates = FeeTemplate::query()->whereIn('id', $paginator->getCollection()->pluck('fee_template_id')->filter())->pluck('name', 'id');
        $rows = $paginator->getCollection()->map(fn ($row) => [
            'fee_type' => $templates[$row->fee_template_id] ?? str($row->invoice_type)->headline()->toString(),
            'invoice_count' => (int) $row->invoice_count,
            'invoiced' => (float) $row->invoiced,
            'collected' => (float) $row->collected,
            'outstanding' => (float) $row->outstanding,
            'collection_rate' => (float) $row->invoiced > 0 ? round(((float) $row->collected / (float) $row->invoiced) * 100, 1) : 0,
        ]);

        return $this->result($paginator, $rows, [
            'fee_type' => 'Fee Type',
            'invoice_count' => 'Invoices',
            'invoiced' => 'Invoiced',
            'collected' => 'Collected',
            'outstanding' => 'Outstanding',
            'collection_rate' => 'Collection Rate %',
        ], [
            'invoiced' => (float) $rows->sum('invoiced'),
            'collected' => (float) $rows->sum('collected'),
            'outstanding' => (float) $rows->sum('outstanding'),
        ]);
    }

    private function adjustmentReport(array $filters): array
    {
        $query = StudentFeeAdjustment::query()
            ->with(['invoice.student.user', 'invoice.academicSession', 'creator'])
            ->whereNull('deleted_at')
            ->when($filters['adjustment_type'], fn (Builder $q, $type) => $q->where('type', $type))
            ->when($filters['date_from'], fn (Builder $q, $date) => $q->whereDate('applied_at', '>=', $date))
            ->when($filters['date_to'], fn (Builder $q, $date) => $q->whereDate('applied_at', '<=', $date))
            ->whereHas('invoice', fn (Builder $invoice) => $this->invoiceScope($invoice, $filters, null))
            ->latest('applied_at');
        $paginator = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $rows = $paginator->getCollection()->map(fn (StudentFeeAdjustment $adjustment) => [
            'date' => $adjustment->applied_at?->format('Y-m-d'),
            'type' => $adjustment->type,
            'invoice_number' => $adjustment->invoice?->invoice_number,
            'student_name' => $adjustment->invoice?->student?->full_name ?? '-',
            'admission_number' => $adjustment->invoice?->student?->admission_number,
            'session_name' => $adjustment->invoice?->academicSession?->name,
            'amount' => (float) $adjustment->amount,
            'description' => $adjustment->description,
        ]);

        return $this->result($paginator, $rows, [
            'date' => 'Date',
            'type' => 'Type',
            'invoice_number' => 'Invoice',
            'student_name' => 'Student',
            'admission_number' => 'Admission No.',
            'session_name' => 'Session',
            'amount' => 'Amount',
            'description' => 'Reason',
        ], ['total' => $totalAdjustments]);
    }

    private function penaltyReport(array $filters): array
    {
        $filters['q'] = $filters['q'] ?? '';
        $query = $this->invoiceScope(Invoice::query()->with(['student.user', 'academicSession']), $filters)
            ->where('invoice_type', 'penalty')
            ->latest('issue_date');
        $paginator = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $balance = $this->balanceExpression();
        $ids = $paginator->getCollection()->pluck('id');
        $balances = Invoice::query()->whereIn('id', $ids)
            ->select('id')->selectRaw("CASE WHEN ({$balance}) > 0 THEN ({$balance}) ELSE 0 END AS balance")->pluck('balance', 'id');
        $rows = $paginator->getCollection()->map(fn (Invoice $invoice) => [
            'date' => $invoice->issue_date?->format('Y-m-d'),
            'invoice_number' => $invoice->invoice_number,
            'student_name' => $invoice->student?->full_name ?? '-',
            'admission_number' => $invoice->student?->admission_number,
            'session_name' => $invoice->academicSession?->name,
            'amount' => (float) $invoice->amount_due,
            'balance' => (float) ($balances[$invoice->id] ?? 0),
            'status' => $invoice->status,
            'reason' => $invoice->notes,
        ]);

        return $this->result($paginator, $rows, [
            'date' => 'Date',
            'invoice_number' => 'Invoice',
            'student_name' => 'Student',
            'admission_number' => 'Admission No.',
            'session_name' => 'Session',
            'amount' => 'Penalty',
            'balance' => 'Balance',
            'status' => 'Status',
            'reason' => 'Reason',
        ], ['total' => (float) $rows->sum('amount'), 'outstanding' => (float) $rows->sum('balance')]);
    }

    private function refundReport(array $filters): array
    {
        $query = Refund::query()
            ->with(['student.user', 'invoice.academicSession', 'processedBy'])
            ->when($filters['date_from'], fn (Builder $q, $date) => $q->whereDate('processed_at', '>=', $date))
            ->when($filters['date_to'], fn (Builder $q, $date) => $q->whereDate('processed_at', '<=', $date))
            ->when($filters['q'], fn (Builder $q, $search) => $q->whereHas('student', fn (Builder $student) => $student
                ->where('admission_number', 'like', "%{$search}%")
                ->orWhereHas('user', fn (Builder $user) => $user->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%"))))
            ->when(
                $filters['department_id'] || $filters['course_id'] || $filters['academic_year_id'] || $filters['academic_session_id'],
                fn (Builder $q) => $q->whereHas('invoice', fn (Builder $invoice) => $this->invoiceScope($invoice, $filters, null))
            )
            ->latest('processed_at');
        $paginator = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $rows = $paginator->getCollection()->map(fn (Refund $refund) => [
            'date' => $refund->processed_at?->format('Y-m-d H:i'),
            'student_name' => $refund->student?->full_name ?? '-',
            'admission_number' => $refund->student?->admission_number,
            'invoice_number' => $refund->invoice?->invoice_number,
            'session_name' => $refund->invoice?->academicSession?->name,
            'amount' => (float) $refund->amount,
            'status' => $refund->status,
            'reason' => $refund->reason,
        ]);

        return $this->result($paginator, $rows, [
            'date' => 'Processed At',
            'student_name' => 'Student',
            'admission_number' => 'Admission No.',
            'invoice_number' => 'Invoice',
            'session_name' => 'Session',
            'amount' => 'Refund',
            'status' => 'Status',
            'reason' => 'Reason',
        ], ['total_refunded' => $totalRefunded]);
    }

    private function assignmentAuditReport(array $filters): array
    {
        $query = FeeAssignmentAudit::query()
            ->with(['assignment.feeTemplate', 'assignment.academicSession', 'modifier'])
            ->latest();
        $paginator = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);
        $rows = $paginator->getCollection()->map(fn (FeeAssignmentAudit $audit) => [
            'date' => $audit->created_at?->format('Y-m-d H:i'),
            'action' => $audit->field,
            'fee_template' => $audit->assignment?->feeTemplate?->name,
            'session_name' => $audit->assignment?->academicSession?->name,
            'old_amount' => (float) $audit->old_value,
            'new_amount' => (float) $audit->new_value,
            'changed_by' => $audit->modifier?->full_name,
        ]);

        return $this->result($paginator, $rows, [
            'date' => 'Date',
            'action' => 'Action',
            'fee_template' => 'Fee Template',
            'session_name' => 'Session',
            'old_amount' => 'Old Amount',
            'new_amount' => 'New Amount',
            'changed_by' => 'Changed By',
        ], ['changes' => $paginator->total()]);
    }

    private function result(LengthAwarePaginator $paginator, Collection $rows, array $columns, array $summary): array
    {
        return [
            'rows' => $rows->values(),
            'columns' => $columns,
            'summary' => $summary,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];
    }

    private function csvValue(mixed $value): string|int|float
    {
        if (is_bool($value)) return $value ? 'Yes' : 'No';
        if (is_scalar($value) || $value === null) return $value ?? '';
        return json_encode($value, JSON_UNESCAPED_UNICODE);
    }
}
