<?php

namespace App\Enums;

enum FinanceAuditAction: string
{
    case INVOICE_CREATED = 'invoice_created';
    case INVOICE_UPDATED = 'invoice_updated';
    case INVOICE_CANCELLED = 'invoice_cancelled';
    case PAYMENT_RECORDED = 'payment_recorded';
    case PAYMENT_REVERSED = 'payment_reversed';
    case ALLOCATION_CREATED = 'allocation_created';
    case ALLOCATION_REVERSED = 'allocation_reversed';
    case DISCOUNT_APPLIED = 'discount_applied';
    case WAIVER_APPLIED = 'waiver_applied';
    case PENALTY_APPLIED = 'penalty_applied';
    case ADJUSTMENT_CREATED = 'adjustment_created';
    case REFUND_ISSUED = 'refund_issued';
    case RECONCILIATION_RUN = 'reconciliation_run';
    case BALANCE_SYNC = 'balance_sync';
}
