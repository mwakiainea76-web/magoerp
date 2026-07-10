<?php

namespace App\Services;

use App\Models\Invoice;

class InvoiceNumberService
{
    public function generate(): string
    {
        $year = now()->year;
        $prefix = 'INV-' . $year . '-';

        $lastInvoiceNumber = Invoice::query()
            ->withTrashed()
            ->where('invoice_number', 'like', $prefix . '%')
            ->orderByDesc('invoice_number')
            ->lockForUpdate()
            ->value('invoice_number');

        $lastSequence = $lastInvoiceNumber
            ? (int) substr($lastInvoiceNumber, strlen($prefix))
            : 0;

        return $prefix . str_pad((string) ($lastSequence + 1), 4, '0', STR_PAD_LEFT);
    }
}
