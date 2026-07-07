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
        'academic_session_id',
        'type',
        'discount_type',
        'discount_percentage',
        'amount',
        'idempotency_key',
        'description',
        'applied_at',
        'ledger_posted',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'discount_percentage' => 'decimal:2',
            'applied_at' => 'date',
            'ledger_posted' => 'boolean',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function ledgerEntry()
    {
        return $this->hasOne(StudentLedgerEntry::class, 'adjustment_id');
    }
}
