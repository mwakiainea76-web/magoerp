<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentLedgerEntry extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'student_ledger_entries';

    protected $fillable = [
        'student_id',
        'invoice_id',
        'payment_id',
        'academic_session_id',
        'type',
        'debit',
        'credit',
        'reference',
        'description',
        'transaction_date',
        'created_by',
    ];

    protected $casts = [
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getNetAmountAttribute(): float
    {
        return (float) $this->debit - (float) $this->credit;
    }
}
