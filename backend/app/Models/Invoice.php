<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\InvoiceLineItem;
use App\Models\InvoicePaymentAllocation;
use App\Models\StudentLedgerEntry;

class Invoice extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'invoices';

    protected $fillable = [
        'invoice_number',
        'student_id',
        'academic_session_id',
        'course_curriculum_id',
        'course_id',
        'department_id',
        'fee_structure_id',
        'invoice_type',
        'status',
        'issue_date',
        'due_date',
        'amount_due',
        'computed_amount',
        'idempotency_key',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'due_date' => 'date',
        'amount_due' => 'decimal:2',
        'computed_amount' => 'decimal:2',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice) {
            if (! $invoice->student_id || $invoice->course_curriculum_id) {
                return;
            }

            $enrolment = CourseEnrolment::query()
                ->with('courseCurriculum.course:id,department_id')
                ->where('student_id', $invoice->student_id)
                ->where('status', 'enrolled')
                ->orderByDesc('enrolment_date')
                ->orderByDesc('created_at')
                ->first();

            $invoice->course_curriculum_id = $enrolment?->course_curriculum_id;
            $invoice->course_id = $enrolment?->courseCurriculum?->course_id;
            $invoice->department_id = $enrolment?->courseCurriculum?->course?->department_id;
        });
    }

    public static function generateInvoiceNumber(): string
    {
        return app(\App\Services\InvoiceNumberService::class)->generate();
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function courseCurriculum(): BelongsTo
    {
        return $this->belongsTo(CourseCurriculum::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(departments::class, 'department_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceLineItem::class);
    }

    public function paymentAllocations(): HasMany
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

    public function recalculateTotals(): static
    {
        $itemsTotal = (float) $this->items()->sum('total_amount');
        $paidAmount = (float) $this->paymentAllocations()
            ->whereHas('payment', fn ($query) => $query->where('status', 'completed'))
            ->sum('amount');
        $balanceDue = $itemsTotal - $paidAmount;

        $this->forceFill([
            'amount_due' => $itemsTotal,
            'computed_amount' => $itemsTotal,
            'status' => $this->status === 'cancelled' ? 'cancelled' : ($balanceDue <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'issued')),
        ]);

        $this->save();

        return $this;
    }
}
