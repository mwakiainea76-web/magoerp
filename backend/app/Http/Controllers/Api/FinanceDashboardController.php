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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use App\Http\Controllers\Api\Traits\BalanceExpression;

class FinanceDashboardController extends Controller
{
    use BalanceExpression;
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $departmentId = $request->query('department_id');
        $courseId = $request->query('course_id');
        $yearId = $request->query('academic_year_id');
        $sessionId = $request->query('academic_session_id');

        // Determine which student IDs to scope to (if filtering by department/course)
        $studentIds = null;
        if ($departmentId || $courseId) {
            $ceQuery = \App\Models\CourseEnrolment::query()
                ->where('status', 'enrolled');

            if ($courseId) {
                $ceQuery->whereHas('courseCurriculum', fn ($q) => $q->where('course_id', $courseId));
            }
            if ($departmentId) {
                $ceQuery->whereHas('courseCurriculum.course', fn ($q) => $q->where('department_id', $departmentId));
            }

            $studentIds = $ceQuery
                ->pluck('student_id')
                ->unique()
                ->values()
                ->all();
        }

        // Base invoice query for scoping
        $invoiceBase = Invoice::query()
            ->where('status', '!=', 'cancelled')
            ->when($studentIds !== null, fn ($q) => $q->whereIn('student_id', $studentIds))
            ->when($sessionId, fn ($q, $v) => $q->where('academic_session_id', $v))
            ->when($yearId && !$sessionId, fn ($q, $v) => $q->whereHas('academicSession', fn ($sq) => $sq->where('academic_year_id', $v)));

        // --- Summary Stats ---

        $totalInvoiced = (float) (clone $invoiceBase)->sum('amount_due');

        if ($sessionId || $yearId) {
            $totalCollected = (float) InvoicePaymentAllocation::query()
                ->whereHas('payment', fn ($q) => $q->where('status', 'completed'))
                ->whereHas('invoice', function ($q) use ($studentIds, $sessionId, $yearId) {
                    $q->where('status', '!=', 'cancelled')
                        ->when($studentIds !== null, fn ($sq) => $sq->whereIn('student_id', $studentIds))
                        ->when($sessionId, fn ($sq, $v) => $sq->where('academic_session_id', $v))
                        ->when($yearId && !$sessionId, fn ($sq, $v) => $sq->whereHas('academicSession', fn ($yq) => $yq->where('academic_year_id', $v)));
                })
                ->sum('amount');
        } else {
            $totalCollected = (float) Payment::query()
                ->where('status', 'completed')
                ->when($studentIds !== null, fn ($q) => $q->whereIn('student_id', $studentIds))
                ->sum('amount');
        }
        $outstandingBalance = (float) (clone $invoiceBase)
            ->whereIn('status', ['issued', 'partial'])
            ->selectRaw("COALESCE(SUM({$this->balanceExpression()}), 0) as balance")
            ->value('balance');

        $totalAdjustments = (float) StudentFeeAdjustment::query()
            ->whereIn('type', ['discount', 'waiver', 'bursary', 'helb', 'reversal'])
            ->whereHas('invoice', fn ($iq) => $iq->where('status', '!=', 'cancelled'))
            ->when($studentIds !== null, fn ($q) => $q->whereHas('invoice', fn ($iq) => $iq->whereIn('student_id', $studentIds)))
            ->when($sessionId, fn ($q, $v) => $q->whereHas('invoice', fn ($iq) => $iq->where('academic_session_id', $v)))
            ->when($yearId && !$sessionId, fn ($q, $v) => $q->whereHas('invoice.academicSession', fn ($sq) => $sq->where('academic_year_id', $v)))
            ->sum('amount');

        $totalRefunds = (float) StudentLedgerEntry::query()
            ->where('type', 'refund')
            ->when($studentIds !== null, fn ($q) => $q->whereIn('student_id', $studentIds))
            ->when($sessionId, fn ($q, $v) => $q->where('academic_session_id', $v))
            ->when($yearId && !$sessionId, fn ($q, $v) => $q->whereHas('academicSession', fn ($sq) => $sq->where('academic_year_id', $v)))
            ->sum('debit');

        $collectionRate = $totalInvoiced > 0
            ? round(min(($totalCollected / $totalInvoiced), 1) * 100, 1)
            : 0;

        $invoiceCounts = [
            'total' => (clone $invoiceBase)->count(),
            'paid' => (clone $invoiceBase)->where('status', 'paid')->count(),
            'partial' => (clone $invoiceBase)->where('status', 'partial')->count(),
            'issued' => (clone $invoiceBase)->where('status', 'issued')->count(),
        ];

        // --- Monthly Revenue ---

        $now = now();
        $monthlyRevenue = Payment::query()
            ->where('status', 'completed')
            ->where('payment_date', '>=', $now->copy()->subMonths(11)->startOfMonth())
            ->when($studentIds !== null, fn ($q) => $q->whereIn('student_id', $studentIds))
            ->selectRaw((DB::getDriverName() === 'sqlite'
                ? "strftime('%Y-%m', payment_date)"
                : "DATE_FORMAT(payment_date, '%Y-%m')") . ' as month')
            ->selectRaw('SUM(amount) as total')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month')
            ->map(fn ($r) => (float) $r->total);

        $revenueTrend = collect();
        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i)->format('Y-m');
            $revenueTrend->push([
                'month' => $month,
                'label' => $now->copy()->subMonths($i)->format('M Y'),
                'total' => $monthlyRevenue->get($month, 0),
            ]);
        }

        // --- Recent Payments ---

        $recentPayments = Payment::query()
            ->where('status', 'completed')
            ->with('student.user')
            ->when($studentIds !== null, fn ($q) => $q->whereIn('student_id', $studentIds))
            ->latest('payment_date')
            ->limit(10)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'student_name' => $p->student?->full_name ?? '-',
                'admission_number' => $p->student?->admission_number,
                'amount' => (float) $p->amount,
                'method' => $p->method,
                'reference' => $p->reference,
                'payment_date' => $p->payment_date?->format('Y-m-d'),
            ]);

        // --- Top Defaulters ---

        $studentNameExpression = DB::getDriverName() === 'sqlite'
            ? "TRIM(COALESCE(users.first_name,'') || ' ' || COALESCE(users.middle_name,'') || ' ' || COALESCE(users.last_name,''))"
            : "TRIM(CONCAT_WS(' ', NULLIF(users.first_name,''), NULLIF(users.middle_name,''), NULLIF(users.last_name,'')))";

        $defaultersQuery = Student::query()
            ->join('invoices', 'students.id', '=', 'invoices.student_id')
            ->leftJoin('users', 'students.user_id', '=', 'users.id')
            ->whereNotIn('invoices.status', ['cancelled', 'paid'])
            ->when($studentIds !== null, fn ($q) => $q->whereIn('students.id', $studentIds))
            ->when($sessionId, fn ($q, $v) => $q->where('invoices.academic_session_id', $v))
            ->groupBy('students.id', 'students.admission_number', 'users.first_name', 'users.middle_name', 'users.last_name')
            ->selectRaw('students.id')
            ->selectRaw('students.admission_number')
            ->selectRaw($studentNameExpression . ' as student_name')
            ->selectRaw("COALESCE((SELECT SUM(amount_due) FROM invoices WHERE student_id = students.id AND status != 'cancelled'), 0) as total_invoiced")
            ->selectRaw('COALESCE((SELECT SUM(amount) FROM invoice_payment_allocations ipa JOIN invoices i2 ON ipa.invoice_id = i2.id WHERE i2.student_id = students.id), 0) as total_paid')
            ->selectRaw("COALESCE((SELECT SUM(CASE WHEN sfa.type IN ('discount','waiver','bursary','helb','reversal') THEN sfa.amount ELSE -sfa.amount END) FROM student_fee_adjustments sfa JOIN invoices i3 ON sfa.invoice_id = i3.id WHERE i3.student_id = students.id AND sfa.deleted_at IS NULL), 0) as total_adjustment_credits")
            ->orderByDesc('total_invoiced')
            ->limit(10);

        $topDefaulters = $defaultersQuery->get()
            ->map(function ($s) {
                $invoiced = (float) $s->total_invoiced;
                $paid = (float) ($s->total_paid ?? 0);
                $credit = (float) ($s->total_adjustment_credits ?? 0);
                $balance = max(0, $invoiced - $paid - $credit);
                return [
                    'id' => $s->id,
                    'student_name' => $s->student_name ?: '-',
                    'admission_number' => $s->admission_number,
                    'outstanding' => $balance,
                    'total_invoiced' => $invoiced,
                ];
            })
            ->filter(fn ($s) => $s['outstanding'] > 0)
            ->values();

        // --- Filter Options ---

        $filters = [
            'departments' => departments::query()
                ->whereIn('id', Course::query()->select('department_id')->whereNotNull('department_id'))
                ->orderBy('name')
                ->get(['id', 'name']),
            'courses' => Course::query()
                ->where('is_active', true)
                ->when($departmentId, fn ($q, $v) => $q->where('department_id', $v))
                ->orderBy('name')
                ->get(['id', 'name']),
            'academic_years' => AcademicYear::query()
                ->orderByDesc('start_date')
                ->get(['id', 'name']),
            'sessions' => AcademicSession::query()
                ->when($yearId, fn ($q, $v) => $q->where('academic_year_id', $v))
                ->orderByDesc('start_date')
                ->get(['id', 'name']),
        ];

        return response()->json([
            'status_code' => 200,
            'filters' => $filters,
            'pending_filters' => [
                'department_id' => $departmentId,
                'course_id' => $courseId,
                'academic_year_id' => $yearId,
                'academic_session_id' => $sessionId,
            ],
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
}
