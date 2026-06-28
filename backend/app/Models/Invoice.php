<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

use App\Models\InvoiceLineItem;
use App\Models\InvoicePaymentAllocation;
use App\Models\StudentFeeAdjustment;
use App\Models\StudentLedgerEntry;

class Invoice extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'invoices';

    protected $fillable = [
        'invoice_number',
        'student_id',
        'academic_session_id',
        'invoice_type',
        'status',
        'issue_date',
        'due_date',
        'amount_due',
        'idempotency_key',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'due_date' => 'date',
        'amount_due' => 'decimal:2',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public static function generateInvoiceNumber(): string
    {
        $prefix = 'INV-';
        $date = now()->format('Ymd');
        $random = strtoupper(Str::random(6));

        return $prefix . $date . '-' . $random;
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceLineItem::class);
    }

    public function paymentAllocations(): HasMany
    {
        return $this->hasMany(InvoicePaymentAllocation::class);
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(StudentFeeAdjustment::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(StudentLedgerEntry::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recalculateTotals(): static
    {
        $itemsTotal = (float) $this->items()->sum('total_amount');
        $creditTypes = ['discount', 'waiver', 'bursary', 'helb', 'reversal'];
        $debitAdjustmentsTotal = (float) $this->adjustments()->whereNotIn('type', $creditTypes)->sum('amount');
        $creditAdjustmentsTotal = (float) $this->adjustments()->whereIn('type', $creditTypes)->sum('amount');
        $paidAmount = (float) $this->paymentAllocations()->sum('amount');

        $amountDue = max(0, $itemsTotal + $debitAdjustmentsTotal - $creditAdjustmentsTotal);
        $balanceDue = $amountDue - $paidAmount;

        $this->forceFill([
            'amount_due' => $amountDue,
            'status' => $balanceDue <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'issued'),
        ]);

        $this->save();

        return $this;
    }
}

