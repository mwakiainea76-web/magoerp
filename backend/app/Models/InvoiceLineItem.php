<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceLineItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'invoice_line_items';

    protected $fillable = [
        'invoice_id',
        'fee_structure_item_id',
        'name',
        'description',
        'amount',
        'quantity',
        'total_amount',
        'snapshot_data',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'snapshot_data' => 'array',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function feeStructureItem(): BelongsTo
    {
        return $this->belongsTo(FeeStructureItem::class, 'fee_structure_item_id');
    }
}
