<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\CourseCurriculum;
use App\Models\CourseEnrolment;
use App\Models\CurriculumFeeStructure;
use App\Models\FeeStructure;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\StudentAccountBalance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceHealthController extends Controller
{
    /**
     * Check overall finance health.
     */
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $activeSession = AcademicSession::where('is_active', true)->latest('start_date')->first();
        $checks = [];

        // 1. Fee Structures Published
        $publishedStructures = FeeStructure::where('is_issued', true)->count();
        $totalStructures = FeeStructure::count();
        $checks[] = [
            'label' => 'Fee Structures Published',
            'status' => $publishedStructures > 0 ? 'pass' : 'warning',
            'detail' => "{$publishedStructures} of {$totalStructures} published",
            'action' => $publishedStructures === 0 ? 'Create and publish at least one fee structure.' : null,
            'link' => $publishedStructures === 0 ? '/admin/finance/fee-structures' : null,
        ];

        // 2. Student Balances Synced
        if ($activeSession) {
            $enrolledStudents = CourseEnrolment::where('status', 'enrolled')->count();
            $studentsWithBalance = StudentAccountBalance::whereHas('student', function($q) {
                $q->whereHas('courseEnrolments', fn($cq) => $cq->where('status', 'enrolled'));
            })->where('academic_session_id', $activeSession->id)->count();
            $percentage = $enrolledStudents > 0 ? round($studentsWithBalance / $enrolledStudents * 100) : 0;
            $checks[] = [
                'label' => 'Student Balances Synced',
                'status' => $percentage >= 80 ? 'pass' : ($percentage > 0 ? 'warning' : 'fail'),
                'detail' => "{$studentsWithBalance} of {$enrolledStudents} enrolled students have balances ({$percentage}%)",
                'action' => $percentage < 80 ? 'Run reconciliation to sync balances.' : null,
                'link' => $percentage < 80 ? '/admin/finance/reports' : null,
            ];
        }

        // 3. Programmes Missing Fee Structures
        $curriculaWithFees = CurriculumFeeStructure::where('is_approved', true)
            ->where('dormant', false)
            ->pluck('course_curriculum_id')
            ->unique();
        $activeCurricula = CourseCurriculum::where('is_active', true)->pluck('id');
        $missingCurricula = $activeCurricula->diff($curriculaWithFees);
        $checks[] = [
            'label' => 'Programmes With Fee Structures',
            'status' => $missingCurricula->isEmpty() ? 'pass' : 'warning',
            'detail' => $missingCurricula->isEmpty()
                ? 'All active programmes have fee structures.'
                : "{$missingCurricula->count()} programme(s) missing fee structures",
            'action' => $missingCurricula->isNotEmpty() ? 'Create fee structures for missing programmes.' : null,
            'link' => $missingCurricula->isNotEmpty() ? '/admin/finance/fee-structures' : null,
        ];

        // 4. Students Missing Fee Assignments
        $curriculaWithApprovedAssignments = CurriculumFeeStructure::query()
            ->where('is_approved', true)
            ->where('dormant', false)
            ->whereNotNull('course_curriculum_id')
            ->pluck('course_curriculum_id')
            ->unique();

        $missingFees = CourseEnrolment::query()
            ->where('status', 'enrolled')
            ->whereNotIn('course_curriculum_id', $curriculaWithApprovedAssignments)
            ->count();
        $checks[] = [
            'label' => 'Students With Fee Assignments',
            'status' => $missingFees === 0 ? 'pass' : 'warning',
            'detail' => $missingFees === 0
                ? 'All enrolled students have fee assignments.'
                : "{$missingFees} student(s) enrolled without fee assignments",
            'action' => $missingFees > 0 ? 'Assign fee structures to their programmes.' : null,
            'link' => $missingFees > 0 ? '/admin/finance/fee-structures' : null,
        ];

        // 5. Ledger Balance Check (sum of account balances vs ledger)
        $balanceSum = (float) StudentAccountBalance::sum('balance');
        $ledgerSum = (float) \App\Models\StudentLedgerEntry::selectRaw('COALESCE(SUM(debit),0) - COALESCE(SUM(credit),0) as net')
            ->value('net');
        $balanced = abs($balanceSum - $ledgerSum) < 0.01;

        $breakdown = [];
        if (!$balanced) {
            // Find specific (student, session) pairs with discrepancies
            $cachedSub = StudentAccountBalance::selectRaw("student_id, academic_session_id, balance as cached_balance");
            $ledgerSub = \App\Models\StudentLedgerEntry::selectRaw("student_id, academic_session_id, SUM(debit) - SUM(credit) as ledger_balance")
                ->groupBy('student_id', 'academic_session_id');

            $pairs = \Illuminate\Support\Facades\DB::query()
                ->fromSub($cachedSub, 'cached')
                ->leftJoinSub($ledgerSub, 'ledger', fn ($j) => $j->on('cached.student_id', '=', 'ledger.student_id')->whereColumn('cached.academic_session_id', '=', 'ledger.academic_session_id'))
                ->where(function ($q) {
                    $q->whereNull('ledger.ledger_balance')->whereRaw('ABS(cached.cached_balance) > 0.01')
                      ->orWhereRaw('ABS(cached.cached_balance - COALESCE(ledger.ledger_balance, 0)) > 0.01');
                })
                ->selectRaw('cached.student_id, cached.academic_session_id, cached.cached_balance, COALESCE(ledger.ledger_balance, 0) as ledger_balance, (cached.cached_balance - COALESCE(ledger.ledger_balance, 0)) as diff')
                ->orderByRaw('ABS(cached.cached_balance - COALESCE(ledger.ledger_balance, 0)) DESC')
                ->limit(25)
                ->get();

            $studentIds = $pairs->pluck('student_id')->unique();
            $students = \App\Models\Student::whereIn('id', $studentIds)->with('user:id,first_name,middle_name,last_name')->get()->keyBy('id');
            $sessions = AcademicSession::whereIn('id', $pairs->pluck('academic_session_id')->unique())->pluck('name', 'id');

            $breakdown = $pairs->map(fn ($row) => [
                'student_id'          => $row->student_id,
                'student_name'        => $students[$row->student_id]?->full_name ?? 'Unknown',
                'academic_session_id' => $row->academic_session_id,
                'session_name'        => $sessions[$row->academic_session_id] ?? 'Unknown',
                'cached_balance'      => (float) $row->cached_balance,
                'ledger_balance'      => (float) $row->ledger_balance,
                'difference'          => (float) $row->diff,
            ])->values()->toArray();
        }

        $checks[] = [
            'label' => 'Ledger Balanced',
            'status' => $balanced ? 'pass' : 'fail',
            'detail' => $balanced
                ? 'Ledger and account balances are in sync.'
                : sprintf(
                    'Discrepancy of Ksh %s between ledger (Ksh %s) and cached balances (Ksh %s). %d student(s) affected.',
                    number_format(abs($balanceSum - $ledgerSum), 2),
                    number_format($ledgerSum, 2),
                    number_format($balanceSum, 2),
                    count($breakdown)
                ),
            'action' => !$balanced ? 'Run reconciliation.' : null,
            'link' => !$balanced ? '/admin/finance/reports' : null,
            'breakdown' => $breakdown,
        ];

        // 6. Duplicate Payment References
        $duplicates = \Illuminate\Support\Facades\DB::table('payments')
            ->whereNotNull('reference')
            ->where('reference', '!=', '')
            ->select('reference', \Illuminate\Support\Facades\DB::raw('COUNT(*) as count'))
            ->groupBy('reference')
            ->having('count', '>', 1)
            ->get();
        $checks[] = [
            'label' => 'Duplicate Payment References',
            'status' => $duplicates->isEmpty() ? 'pass' : 'warning',
            'detail' => $duplicates->isEmpty()
                ? 'No duplicate payment references.'
                : "{$duplicates->count()} reference(s) used more than once",
            'action' => $duplicates->isNotEmpty() ? 'Review payments for duplicates.' : null,
            'link' => $duplicates->isNotEmpty() ? '/admin/finance/payments' : null,
        ];

        // 7. Reconciliation status
        $lastRecon = \App\Models\FinanceAuditLog::where('action', 'reconciliation_run')
            ->latest()->first();
        $daysSinceRecon = $lastRecon ? now()->diffInDays($lastRecon->created_at) : 999;
        $checks[] = [
            'label' => 'Reconciliation Completed',
            'status' => $daysSinceRecon < 7 ? 'pass' : ($daysSinceRecon < 30 ? 'warning' : 'fail'),
            'detail' => $lastRecon
                ? "Last reconciliation: {$daysSinceRecon} day(s) ago"
                : 'No reconciliation record found',
            'action' => $daysSinceRecon >= 7 ? 'Run reconciliation.' : null,
            'link' => $daysSinceRecon >= 7 ? '/admin/finance/reports' : null,
        ];

        return response()->json(['data' => $checks]);
    }

    /**
     * Finance readiness check for a specific session.
     */
    public function readiness(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $sessionId = $request->input('academic_session_id');
        $session = $sessionId
            ? AcademicSession::findOrFail($sessionId)
            : AcademicSession::where('is_active', true)->latest('start_date')->first();

        if (!$session) {
            return response()->json(['data' => ['ready' => false, 'issues' => [['check' => 'Academic Session', 'status' => 'fail', 'message' => 'No active academic session found.']]]]);
        }

        $issues = [];

        // Session exists
        $issues[] = [
            'check' => 'Session exists',
            'status' => 'pass',
            'message' => "{$session->name} ({$session->code})",
        ];

        // Published fee structures
        $publishedCount = FeeStructure::where('is_issued', true)->count();
        $issues[] = [
            'check' => 'Published Fee Structures',
            'status' => $publishedCount > 0 ? 'pass' : 'fail',
            'message' => $publishedCount > 0 ? "{$publishedCount} published" : 'No published fee structures',
            'action' => $publishedCount === 0 ? 'Create and publish at least one fee structure.' : null,
        ];

        // Assignments complete
        $assignmentsCount = CurriculumFeeStructure::where('is_approved', true)
            ->where('dormant', false)
            ->count();
        $issues[] = [
            'check' => 'Assignments Complete',
            'status' => $assignmentsCount > 0 ? 'pass' : 'fail',
            'message' => $assignmentsCount > 0 ? "{$assignmentsCount} active assignments" : 'No fee assignments configured',
            'action' => $assignmentsCount === 0 ? 'Assign fee structures to programmes.' : null,
        ];

        // Students enrolled
        $enrolledCount = CourseEnrolment::where('status', 'enrolled')->count();
        $issues[] = [
            'check' => 'Students Enrolled',
            'status' => $enrolledCount > 0 ? 'pass' : 'warning',
            'message' => "{$enrolledCount} enrolled students",
        ];

        // Payment methods configured (check if any payments recorded)
        $paymentMethods = Payment::distinct()->pluck('method');
        $issues[] = [
            'check' => 'Payment Methods Used',
            'status' => $paymentMethods->isNotEmpty() ? 'pass' : 'info',
            'message' => $paymentMethods->isNotEmpty()
                ? $paymentMethods->implode(', ')
                : 'No payments recorded yet',
        ];

        $allPass = collect($issues)->every(fn($i) => $i['status'] === 'pass' || $i['status'] === 'info');

        return response()->json([
            'data' => [
                'session' => ['id' => $session->id, 'name' => $session->name, 'code' => $session->code],
                'ready' => $allPass,
                'issues' => $issues,
            ],
        ]);
    }
}
