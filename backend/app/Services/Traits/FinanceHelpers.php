<?php

namespace App\Services\Traits;

use App\Enums\FinanceAuditAction;
use App\Models\FinanceAuditLog;
use App\Models\Invoice;
use App\Models\InvoicePaymentAllocation;
use App\Models\Student;
use App\Models\StudentAccountBalance;
use App\Models\StudentLedgerEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

trait FinanceHelpers
{
    private function calculateOutstanding(Invoice $invoice): float
    {
        $allocated = (float) $invoice->paymentAllocations()
            ->whereHas('payment', fn ($query) => $query->where('status', 'completed'))
            ->sum('amount');

        return max(0, (float) $invoice->amount_due - $allocated);
    }

    public function syncAccountBalance(string $studentId, ?string $academicSessionId): void
    {
        if (!$academicSessionId) {
            return;
        }

        $totals = StudentLedgerEntry::query()
            ->where('student_id', $studentId)
            ->where('academic_session_id', $academicSessionId)
            ->selectRaw('
                COALESCE(SUM(CASE WHEN type = \'invoice\' THEN debit ELSE 0 END), 0) as total_invoiced,
                COALESCE(SUM(CASE WHEN type = \'payment\' THEN credit ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN type = \'refund\' THEN debit ELSE 0 END), 0) as total_refunded,
                COALESCE(SUM(CASE WHEN type = \'payment_reversal\' THEN debit ELSE 0 END), 0) as total_payment_reversals,
                COALESCE(SUM(CASE WHEN type = \'invoice_reversal\' THEN credit ELSE 0 END), 0) as total_reversal_credits,
                COALESCE(SUM(CASE WHEN type = \'adjustment\' THEN credit ELSE 0 END), 0) as adjustment_credits,
                COALESCE(SUM(CASE WHEN type = \'adjustment\' THEN debit ELSE 0 END), 0) as adjustment_debits
            ')
            ->first();

        $totalInvoiced = (float) ($totals->total_invoiced ?? 0);
        $totalPaid = (float) ($totals->total_paid ?? 0);
        $totalRefunded = (float) ($totals->total_refunded ?? 0);
        $totalPaymentReversals = (float) ($totals->total_payment_reversals ?? 0);
        $totalReversalCredits = (float) ($totals->total_reversal_credits ?? 0);
        $adjustmentCredits = (float) ($totals->adjustment_credits ?? 0);
        $adjustmentDebits = (float) ($totals->adjustment_debits ?? 0);
        $totalAdjustments = $adjustmentCredits - $adjustmentDebits;

        StudentAccountBalance::updateOrCreate(
            [
                'student_id'          => $studentId,
                'academic_session_id' => $academicSessionId,
            ],
            [
                'total_invoiced'      => $totalInvoiced,
                'total_paid'          => $totalPaid,
                'total_adjustments'   => $totalAdjustments,
                'balance'             => $totalInvoiced - $totalPaid + $totalRefunded + $totalPaymentReversals - $totalReversalCredits - $totalAdjustments,
                'last_transaction_at' => now(),
            ]
        );
    }

    public function auditLog(
        Student $student,
        FinanceAuditAction $action,
        string $entityType,
        int|string $entityId,
        array $changes = []
    ): void {
        $request = app(Request::class);

        FinanceAuditLog::create([
            'student_id'  => $student->id,
            'user_id'     => Auth::id(),
            'action'      => $action,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'changes'     => $changes,
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ]);
    }
}
