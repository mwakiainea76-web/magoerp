<?php

namespace App\Enums;

enum FinanceAuditAction: string
{
    case INVOICE_CREATED = 'invoice_created';
    case PAYMENT_RECORDED = 'payment_recorded';
    case RECONCILIATION_RUN = 'reconciliation_run';
}
