<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceComponent extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'invoice_id',
        'invoice_template_item_id',
        'name',
        'amount',
        'description',
        'snapshot_data',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'snapshot_data' => 'array',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function invoiceTemplateItem(): BelongsTo
    {
        return $this->belongsTo(InvoiceTemplateItem::class, 'invoice_template_item_id');
    }
}
