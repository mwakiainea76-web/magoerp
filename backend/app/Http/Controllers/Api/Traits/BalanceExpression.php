<?php

namespace App\Http\Controllers\Api\Traits;

trait BalanceExpression
{
    protected function balanceExpression(): string
    {
        return "amount_due
            - COALESCE((SELECT SUM(amount) FROM invoice_payment_allocations WHERE invoice_id = invoices.id), 0)";
    }
}
