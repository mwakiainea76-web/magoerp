<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\departments;
use App\Models\Invoice;
use App\Models\InvoicePaymentAllocation;
use App\Models\Payment;
use App\Models\Student;
use App\Models\StudentFeeAdjustment;
use App\Models\StudentLedgerEntry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use App\Http\Controllers\Api\Traits\BalanceExpression;

class FinanceReportsDashboardController extends Controller
{
    use BalanceExpression;
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $departmentId = (string) $request->query('department_id', '');
        $courseId = (string) $request->query('course_id', '');
        $yearId = (string) $request->query('academic_year_id', '');
        $sessionId = (string) $request->query('academic_session_id', '');
        $hasInvoiceScope = $departmentId !== '' || $courseId !== '' || $yearId !== '' || $sessionId !== '';

        $scopeInvoice = static function (Builder $query) use ($departmentId, $courseId, $yearId, $sessionId): Builder {
            return $query
                ->where('status', '!=', 'cancelled')
                ->when($departmentId !== '', fn (Builder $q) => $q->where('department_id', $departmentId))
                ->when($courseId !== '', fn (Builder $q) => $q->where('course_id', $courseId))
                ->when($sessionId !== '', fn (Builder $q) => $q->where('academic_session_id', $sessionId))
                ->when($yearId !== '' && $sessionId === '', fn (Builder $q) => $q->whereHas(
                    'academicSession',
                    fn (Builder $session) => $session->where('academic_year_id', $yearId)
                ));
        };

        $invoiceBase = $scopeInvoice(Invoice::query());
        $totalInvoiced = (float) (clone $invoiceBase)->sum('amount_due');

        $totalCollected = $hasInvoiceScope
            ? (float) InvoicePaymentAllocation::query()
                ->whereHas('payment', fn (Builder $q) => $q->where('status', 'completed'))
                ->whereHas('invoice', $scopeInvoice)
                ->sum('amount')
            : (float) Payment::query()->where('status', 'completed')->sum('amount');

        $invoiceOutstanding = (float) (clone $invoiceBase)
            ->selectRaw("COALESCE(SUM(CASE WHEN ({$this->balanceExpression()}) > 0 THEN ({$this->balanceExpression()}) ELSE 0 END), 0) AS balance")
            ->value('balance');

        $unallocatedCredits = 0.0;
        if ($departmentId === '' && $courseId === '') {
            $unallocatedCredits = (float) StudentLedgerEntry::query()
                ->where('type', 'payment')
                ->whereNull('invoice_id')
                ->when($sessionId !== '', fn (Builder $q) => $q->where('academic_session_id', $sessionId))
                ->when($yearId !== '' && $sessionId === '', fn (Builder $q) => $q->whereHas(
                    'academicSession',
                    fn (Builder $session) => $session->where('academic_year_id', $yearId)
                ))
                ->sum('credit');
        }
        $outstandingBalance = $invoiceOutstanding - $unallocatedCredits;

        $totalAdjustments = (float) StudentFeeAdjustment::query()
            ->whereNull('deleted_at')
            ->whereHas('invoice', $scopeInvoice)
            ->selectRaw("COALESCE(SUM(CASE WHEN type IN ('discount','waiver','bursary','helb','reversal') THEN amount ELSE -amount END), 0) AS total")
            ->value('total');

        $totalRefunds = (float) StudentLedgerEntry::query()
            ->where('type', 'refund')
            ->when($sessionId !== '', fn (Builder $q) => $q->where('academic_session_id', $sessionId))
            ->when($yearId !== '' && $sessionId === '', fn (Builder $q) => $q->whereHas(
                'academicSession',
                fn (Builder $session) => $session->where('academic_year_id', $yearId)
            ))
            ->when($departmentId !== '' || $courseId !== '', fn (Builder $q) => $q->whereHas('invoice', $scopeInvoice))
            ->sum('debit');

        $collectionRate = $totalInvoiced > 0 ? round(($totalCollected / $totalInvoiced) * 100, 1) : 0;
        $invoiceCounts = [
            'total' => (clone $invoiceBase)->count(),
            'paid' => (clone $invoiceBase)->where('status', 'paid')->count(),
            'partial' => (clone $invoiceBase)->where('status', 'partial')->count(),
            'issued' => (clone $invoiceBase)->where('status', 'issued')->count(),
        ];

        $monthlyRevenue = $this->monthlyRevenue($hasInvoiceScope, $departmentId, $courseId, $yearId, $sessionId);
        $now = now();
        $revenueTrend = collect();
        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i)->format('Y-m');
            $revenueTrend->push([
                'month' => $month,
                'label' => $now->copy()->subMonths($i)->format('M Y'),
                'total' => (float) ($monthlyRevenue[$month] ?? 0),
            ]);
        }

        $recentPayments = Payment::query()
            ->where('status', 'completed')
            ->with(['student.user', 'allocations' => fn ($q) => $q->with('invoice.academicSession')])
            ->when($hasInvoiceScope, fn (Builder $q) => $q->whereHas('allocations.invoice', $scopeInvoice))
            ->latest('payment_date')
            ->limit(10)
            ->get()
            ->map(function (Payment $payment) use ($hasInvoiceScope, $departmentId, $courseId, $yearId, $sessionId) {
                $amount = (float) $payment->amount;
                if ($hasInvoiceScope) {
                    $amount = (float) $payment->allocations
                        ->filter(fn ($allocation) => $this->invoiceMatches(
                            $allocation->invoice,
                            $departmentId,
                            $courseId,
                            $yearId,
                            $sessionId
                        ))
                        ->sum('amount');
                }

                return [
                    'id' => $payment->id,
                    'student_name' => $payment->student?->full_name ?? '-',
                    'admission_number' => $payment->student?->admission_number,
                    'amount' => $amount,
                    'method' => $payment->method,
                    'reference' => $payment->reference,
                    'payment_date' => $payment->payment_date?->format('Y-m-d'),
                ];
            });

        $defaulters = (clone $invoiceBase)
            ->select('student_id')
            ->selectRaw('SUM(amount_due) AS total_invoiced')
            ->selectRaw("SUM(CASE WHEN ({$this->balanceExpression()}) > 0 THEN ({$this->balanceExpression()}) ELSE 0 END) AS outstanding")
            ->groupBy('student_id')
            ->orderByDesc('outstanding')
            ->limit(25)
            ->get();
        $students = Student::query()
            ->with('user')
            ->whereIn('id', $defaulters->pluck('student_id'))
            ->get()
            ->keyBy('id');
        $creditByStudent = collect();
        if ($departmentId === '' && $courseId === '') {
            $creditByStudent = StudentLedgerEntry::query()
                ->whereIn('student_id', $defaulters->pluck('student_id'))
                ->where('type', 'payment')
                ->whereNull('invoice_id')
                ->when($sessionId !== '', fn (Builder $q) => $q->where('academic_session_id', $sessionId))
                ->when($yearId !== '' && $sessionId === '', fn (Builder $q) => $q->whereHas(
                    'academicSession',
                    fn (Builder $session) => $session->where('academic_year_id', $yearId)
                ))
                ->groupBy('student_id')
                ->selectRaw('student_id, SUM(credit) AS total')
                ->pluck('total', 'student_id');
        }
        $topDefaulters = $defaulters
            ->map(function ($row) use ($students, $creditByStudent) {
                $student = $students->get($row->student_id);
                return [
                    'id' => $row->student_id,
                    'student_name' => $student?->full_name ?? '-',
                    'admission_number' => $student?->admission_number,
                    'outstanding' => (float) $row->outstanding - (float) ($creditByStudent[$row->student_id] ?? 0),
                    'total_invoiced' => (float) $row->total_invoiced,
                ];
            })
            ->filter(fn (array $row) => $row['outstanding'] > 0)
            ->sortByDesc('outstanding')
            ->take(10)
            ->values();

        return response()->json([
            'status_code' => 200,
            'filters' => [
                'departments' => departments::query()->orderBy('name')->get(['id', 'name']),
                'courses' => Course::query()
                    ->where('is_active', true)
                    ->when($departmentId !== '', fn (Builder $q) => $q->where('department_id', $departmentId))
                    ->orderBy('name')->get(['id', 'name']),
                'academic_years' => AcademicYear::query()->orderByDesc('start_date')->get(['id', 'name']),
                'sessions' => AcademicSession::query()
                    ->when($yearId !== '', fn (Builder $q) => $q->where('academic_year_id', $yearId))
                    ->orderByDesc('start_date')->get(['id', 'name']),
            ],
            'pending_filters' => compact('departmentId', 'courseId', 'yearId', 'sessionId'),
            'data' => [
                'summary' => [
                    'total_invoiced' => $totalInvoiced,
                    'total_collected' => $totalCollected,
                    'outstanding_balance' => $outstandingBalance,
                    'total_adjustments' => $totalAdjustments,
                    'total_refunds' => $totalRefunds,
                    'collection_rate' => $collectionRate,
                    'invoice_counts' => $invoiceCounts,
                ],
                'revenue_trend' => $revenueTrend,
                'recent_payments' => $recentPayments,
                'top_defaulters' => $topDefaulters,
            ],
        ]);
    }

    private function monthlyRevenue(bool $scoped, string $departmentId, string $courseId, string $yearId, string $sessionId)
    {
        $dateExpression = DB::getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', payments.payment_date)"
            : "DATE_FORMAT(payments.payment_date, '%Y-%m')";
        $from = now()->subMonths(11)->startOfMonth();

        if (! $scoped) {
            return Payment::query()
                ->where('status', 'completed')
                ->where('payment_date', '>=', $from)
                ->selectRaw("{$dateExpression} AS month, SUM(amount) AS total")
                ->groupBy('month')
                ->pluck('total', 'month');
        }

        return InvoicePaymentAllocation::query()
            ->join('payments', 'payments.id', '=', 'invoice_payment_allocations.payment_id')
            ->join('invoices', 'invoices.id', '=', 'invoice_payment_allocations.invoice_id')
            ->leftJoin('academic_sessions', 'academic_sessions.id', '=', 'invoices.academic_session_id')
            ->where('payments.status', 'completed')
            ->whereNull('invoices.deleted_at')
            ->where('invoices.status', '!=', 'cancelled')
            ->where('payments.payment_date', '>=', $from)
            ->when($departmentId !== '', fn ($q) => $q->where('invoices.department_id', $departmentId))
            ->when($courseId !== '', fn ($q) => $q->where('invoices.course_id', $courseId))
            ->when($sessionId !== '', fn ($q) => $q->where('invoices.academic_session_id', $sessionId))
            ->when($yearId !== '' && $sessionId === '', fn ($q) => $q->where('academic_sessions.academic_year_id', $yearId))
            ->selectRaw("{$dateExpression} AS month, SUM(invoice_payment_allocations.amount) AS total")
            ->groupBy('month')
            ->pluck('total', 'month');
    }

    private function invoiceMatches(?Invoice $invoice, string $departmentId, string $courseId, string $yearId, string $sessionId): bool
    {
        if (! $invoice || $invoice->status === 'cancelled') return false;
        if ($departmentId !== '' && $invoice->department_id !== $departmentId) return false;
        if ($courseId !== '' && $invoice->course_id !== $courseId) return false;
        if ($sessionId !== '' && $invoice->academic_session_id !== $sessionId) return false;
        if ($yearId !== '' && $sessionId === '' && $invoice->academicSession?->academic_year_id !== $yearId) return false;
        return true;
    }
}
