<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StudentFeeAdjustment extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'student_fee_adjustments';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'invoice_id',
        'type',
        'amount',
        'idempotency_key',
        'description',
        'applied_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'applied_at' => 'date',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
