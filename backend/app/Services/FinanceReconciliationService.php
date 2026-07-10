<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Student;
use App\Models\StudentAccountBalance;
use App\Models\StudentLedgerEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FinanceReconciliationService
{
    public function reconcileStudent(Student $student, array $sessionIds = []): array
    {
        $results = [];

        $query = StudentAccountBalance::query()->where('student_id', $student->id);
        if ($sessionIds) {
            $query->whereIn('academic_session_id', $sessionIds);
        }

        $balances = $query->get();

        foreach ($balances as $balance) {
            $result = $this->reconcileSessionBalance($student, $balance->academic_session_id);
            $results[] = $result;
        }

        if ($balances->isEmpty()) {
            $results[] = [
                'student_id' => $student->id,
                'session_id' => null,
                'status' => 'skipped',
                'message' => 'No account balance records found.',
            ];
        }

        return $results;
    }

    public function reconcileSessionBalance(Student $student, string $sessionId): array
    {
        $computed = $this->computeBalanceFromLedger($student->id, $sessionId);
        $stored = StudentAccountBalance::query()
            ->where('student_id', $student->id)
            ->where('academic_session_id', $sessionId)
            ->first();

        $mismatches = [];

        if ($stored) {
            $fields = ['total_invoiced', 'total_paid', 'total_refunded', 'total_adjustments', 'balance'];
            foreach ($fields as $field) {
                $storedVal = (float) ($stored->$field ?? 0);
                $computedVal = (float) ($computed[$field] ?? 0);
                if (abs($storedVal - $computedVal) > 0.01) {
                    $mismatches[$field] = [
                        'stored' => $storedVal,
                        'computed' => $computedVal,
                    ];
                }
            }
        } else {
            $mismatches['balance'] = [
                'stored' => 0,
                'computed' => $computed['balance'],
            ];
        }

        if (!empty($mismatches)) {
            StudentAccountBalance::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'academic_session_id' => $sessionId,
                ],
                $computed
            );

            Log::warning('FinanceReconciliation: balance corrected', [
                'student_id' => $student->id,
                'session_id' => $sessionId,
                'mismatches' => $mismatches,
            ]);
        }

        return [
            'student_id' => $student->id,
            'session_id' => $sessionId,
            'status' => empty($mismatches) ? 'ok' : 'corrected',
            'mismatches' => $mismatches,
        ];
    }

    public function reconcileInvoice(Invoice $invoice): array
    {
        $issues = [];

        $lineItemsTotal = (float) $invoice->items()->sum('total_amount');
        $allocationsTotal = (float) $invoice->paymentAllocations()
            ->whereHas('payment', fn ($query) => $query->where('status', 'completed'))
            ->sum('amount');

        $expectedAmountDue = max(0, $lineItemsTotal);
        $expectedPaid = $allocationsTotal;
        $expectedBalance = max(0, $expectedAmountDue - $expectedPaid);
        $expectedStatus = $expectedBalance <= 0 ? 'paid' : ($expectedPaid > 0 ? 'partial' : 'issued');

        if (abs((float) $invoice->amount_due - $expectedAmountDue) > 0.01) {
            $issues['amount_due'] = [
                'stored' => (float) $invoice->amount_due,
                'expected' => $expectedAmountDue,
            ];
        }

        if (abs((float) $invoice->computed_amount - $lineItemsTotal) > 0.01) {
            $issues['computed_amount'] = [
                'stored' => (float) $invoice->computed_amount,
                'expected' => $lineItemsTotal,
            ];
        }

        $statusMap = ['issued' => 0, 'partial' => 1, 'paid' => 2];
        if (($statusMap[$invoice->status] ?? -1) !== ($statusMap[$expectedStatus] ?? -1)) {
            $issues['status'] = [
                'stored' => $invoice->status,
                'expected' => $expectedStatus,
            ];
        }

        if (!empty($issues)) {
            $invoice->update([
                'amount_due' => $expectedAmountDue,
                'computed_amount' => $lineItemsTotal,
                'status' => $expectedStatus,
                'updated_by' => $invoice->updated_by,
            ]);

            Log::warning('FinanceReconciliation: invoice corrected', [
                'invoice_id' => $invoice->id,
                'issues' => $issues,
            ]);
        }

        return [
            'invoice_id' => $invoice->id,
            'status' => empty($issues) ? 'ok' : 'corrected',
            'issues' => $issues,
        ];
    }

    public function reconcileAll(): array
    {
        $results = [];

        $invoices = Invoice::query()
            ->whereIn('status', ['issued', 'partial', 'paid'])
            ->cursor();

        foreach ($invoices as $invoice) {
            $results['invoices'][] = $this->reconcileInvoice($invoice);
        }

        $balances = StudentAccountBalance::query()->cursor();
        foreach ($balances as $balance) {
            $student = Student::find($balance->student_id);
            if ($student) {
                $results['balances'][] = $this->reconcileSessionBalance($student, $balance->academic_session_id);
            }
        }

        return $results;
    }

    private function computeBalanceFromLedger(string $studentId, string $sessionId): array
    {
        $totals = StudentLedgerEntry::query()
            ->where('student_id', $studentId)
            ->where('academic_session_id', $sessionId)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN type = 'invoice' THEN debit ELSE 0 END), 0) as total_invoiced,
                COALESCE(SUM(CASE WHEN type = 'payment' THEN credit ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN type = 'refund' THEN debit ELSE 0 END), 0) as total_refunded,
                COALESCE(SUM(CASE WHEN type = 'payment_reversal' THEN debit ELSE 0 END), 0) as total_payment_reversals,
                COALESCE(SUM(CASE WHEN type = 'invoice_reversal' THEN credit ELSE 0 END), 0) as total_reversal_credits,
                COALESCE(SUM(CASE WHEN type = 'adjustment' THEN credit ELSE 0 END), 0) as adjustment_credits,
                COALESCE(SUM(CASE WHEN type = 'adjustment' THEN debit ELSE 0 END), 0) as adjustment_debits
            ")
            ->first();

        $totalInvoiced = (float) ($totals->total_invoiced ?? 0);
        $totalPaid = (float) ($totals->total_paid ?? 0);
        $totalRefunded = (float) ($totals->total_refunded ?? 0);
        $totalPaymentReversals = (float) ($totals->total_payment_reversals ?? 0);
        $totalReversalCredits = (float) ($totals->total_reversal_credits ?? 0);
        $adjustmentCredits = (float) ($totals->adjustment_credits ?? 0);
        $adjustmentDebits = (float) ($totals->adjustment_debits ?? 0);
        $totalAdjustments = $adjustmentCredits - $adjustmentDebits;
        $balance = $totalInvoiced - $totalPaid + $totalRefunded + $totalPaymentReversals - $totalReversalCredits - $totalAdjustments;

        return [
            'total_invoiced' => $totalInvoiced,
            'total_paid' => $totalPaid,
            'total_refunded' => $totalRefunded,
            'total_adjustments' => $totalAdjustments,
            'balance' => round($balance, 2),
        ];
    }
}
