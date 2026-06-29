<?php

namespace App\Services;

use App\Models\Invoice;

class InvoiceNumberService
{
    public function generate(): string
    {
        $year = now()->year;
        $prefix = 'INV-' . $year . '-';

        $lastSequence = Invoice::query()
            ->withTrashed()
            ->where('invoice_number', 'like', $prefix . '%')
            ->lockForUpdate()
            ->pluck('invoice_number')
            ->map(fn (string $number) => (int) substr($number, strlen($prefix)))
            ->max() ?? 0;

        return $prefix . str_pad((string) ($lastSequence + 1), 4, '0', STR_PAD_LEFT);
    }
}
