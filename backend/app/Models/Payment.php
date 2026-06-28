<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Models\InvoicePaymentAllocation;
use App\Models\StudentLedgerEntry;

class Payment extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'payments';

    protected $fillable = [
        'student_id',
        'amount',
        'payment_date',
        'method',
        'reference',
        'status',
        'idempotency_key',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(InvoicePaymentAllocation::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(StudentLedgerEntry::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getAllocatedTotalAttribute(): float
    {
        return (float) $this->allocations()->sum('amount');
    }

    public function getUnallocatedAmountAttribute(): float
    {
        return (float) $this->amount - $this->allocated_total;
    }
}
