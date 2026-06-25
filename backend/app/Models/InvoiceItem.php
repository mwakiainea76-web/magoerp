<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'invoice_items';

    protected $fillable = [
        'invoice_id',
        'invoice_template_item_id',
        'description',
        'unit_amount',
        'quantity',
        'total_amount',
    ];

    protected $casts = [
        'unit_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function invoiceTemplateItem(): BelongsTo
    {
        return $this->belongsTo(InvoiceTemplateItem::class);
    }
}
