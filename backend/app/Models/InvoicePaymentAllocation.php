<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoicePaymentAllocation extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'invoice_payment_allocations';

    protected $fillable = [
        'payment_id',
        'invoice_id',
        'amount',
        'allocated_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'allocated_at' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
