<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

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
        'paid_amount',
        'balance_due',
        'idempotency_key',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'due_date' => 'date',
        'amount_due' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_due' => 'decimal:2',
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
        return $this->hasMany(InvoiceItem::class);
    }

    public function components(): HasMany
    {
        return $this->hasMany(InvoiceComponent::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function paymentAllocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(InvoiceAdjustment::class);
    }

    public function ledgerTransactions(): HasMany
    {
        return $this->hasMany(LedgerTransaction::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recalculateTotals(): static
    {
        $itemsTotal = (float) $this->items()->sum('total_amount');
        $adjustmentsTotal = (float) $this->adjustments()->sum('amount');
        $paidAmount = (float) $this->paymentAllocations()->sum('amount');

        $amountDue = $itemsTotal + $adjustmentsTotal;
        $balanceDue = $amountDue - $paidAmount;

        $this->forceFill([
            'amount_due' => $amountDue,
            'paid_amount' => $paidAmount,
            'balance_due' => max(0, $balanceDue),
            'status' => $balanceDue <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'issued'),
        ]);

        $this->save();

        return $this;
    }
}
