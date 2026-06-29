<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentAccountBalance extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'student_account_balances';

    protected $fillable = [
        'student_id',
        'academic_session_id',
        'total_invoiced',
        'total_paid',
        'total_adjustments',
        'balance',
        'last_transaction_at',
    ];

    protected $casts = [
        'total_invoiced' => 'decimal:2',
        'total_paid' => 'decimal:2',
        'total_adjustments' => 'decimal:2',
        'balance' => 'decimal:2',
        'last_transaction_at' => 'datetime',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->balance > 0;
    }
}
