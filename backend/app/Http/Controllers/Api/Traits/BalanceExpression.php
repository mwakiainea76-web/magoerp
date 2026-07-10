<?php

namespace App\Http\Controllers\Api\Traits;

trait BalanceExpression
{
    protected function balanceExpression(): string
    {
        return "amount_due
            - COALESCE((
                SELECT SUM(invoice_payment_allocations.amount)
                FROM invoice_payment_allocations
                INNER JOIN payments ON payments.id = invoice_payment_allocations.payment_id
                WHERE invoice_payment_allocations.invoice_id = invoices.id
                    AND payments.status = 'completed'
            ), 0)";
    }
}
