<?php

namespace App\Http\Controllers\Api\Traits;

trait BalanceExpression
{
    protected function balanceExpression(): string
    {
        return "amount_due
            - COALESCE((SELECT SUM(amount) FROM invoice_payment_allocations WHERE invoice_id = invoices.id), 0)
            - COALESCE((SELECT SUM(CASE WHEN type IN ('discount','waiver','bursary','helb','reversal') THEN amount ELSE -amount END)
                FROM student_fee_adjustments WHERE invoice_id = invoices.id AND deleted_at IS NULL), 0)";
    }

    protected function adjustmentExpression(): string
    {
        return "COALESCE(SUM(CASE WHEN type IN ('discount','waiver','bursary','helb','reversal') THEN amount ELSE -amount END), 0)";
    }
}
