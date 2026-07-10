<?php

namespace App\Services;

use App\Enums\FinanceAuditAction;
use App\Enums\StudentStatus;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CourseCurriculum;
use App\Models\CurriculumFeeAssignment;
use App\Models\Hostel;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\InvoicePaymentAllocation;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Student;
use App\Models\StudentAccountBalance;
use App\Models\StudentLedgerEntry;
use App\Services\Traits\FinanceHelpers;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceService
{
    use FinanceHelpers;

    public function createInvoiceForStudent(
        Student $student,
        ?string $createdBy = null,
        ?AcademicSession $session = null,
        ?string $invoiceTemplateId = null
    ): Invoice {
        return DB::transaction(function () use ($student, $createdBy, $session, $invoiceTemplateId) {

            $courseCurriculumId = $student->courseEnrolments()
                ->where('status', 'enrolled')
                ->latest()
                ->value('course_curriculum_id');

            if (!$courseCurriculumId) {
                throw ValidationException::withMessages([
                    'course' => 'Student has no course curriculum assigned.',
                ]);
            }

            $departmentId = CourseCurriculum::query()
                ->with('course:id,department_id')
                ->find($courseCurriculumId)?->course?->department_id;

            $targetSession = $session ?? AcademicSession::query()
                ->where('is_active', true)
                ->whereHas('year', fn ($query) => $query->where('is_active', true))
                ->latest('start_date')
                ->first();

            if (!$targetSession) {
                throw ValidationException::withMessages([
                    'session' => 'No active academic session found.',
                ]);
            }

            $enrolment = $this->resolveSessionEnrolment($student, $targetSession)
                ?? AcademicSessionEnrolment::query()
                    ->where('student_id', $student->id)
                    ->latest('enrolled_at')
                    ->latest('created_at')
                    ->first();
            $billingYearLevel = $enrolment?->year_of_study ?? 1;
            $billingSessionNumber = $enrolment?->session_number ?? 1;

            $idempotencyKey = "fees:{$student->id}:{$targetSession->id}";

            $existingInvoice = Invoice::query()
                ->where('idempotency_key', $idempotencyKey)
                ->where('status', '!=', 'cancelled')
                ->first();

            if ($existingInvoice) {
                return $existingInvoice;
            }

            $assignment = CurriculumFeeAssignment::query()
                ->when(
                    $invoiceTemplateId,
                    fn ($q) => $q->whereHas('feeTemplate', fn ($q) => $q->where('id', $invoiceTemplateId))
                )
                ->where(function ($query) use ($courseCurriculumId, $departmentId) {
                    $query->where('course_curriculum_id', $courseCurriculumId);
                    if ($departmentId) {
                        $query->orWhere(function ($departmentQuery) use ($departmentId) {
                            $departmentQuery->where('department_id', $departmentId)
                                ->whereNull('course_curriculum_id');
                        });
                    }
                })
                ->where(function ($query) use ($targetSession) {
                    $query->where('academic_session_id', $targetSession->id)
                        ->orWhereNull('academic_session_id')
                        ->orWhereHas('academicSession', fn ($sessionQuery) => $sessionQuery
                            ->where('academic_year_id', $targetSession->academic_year_id));
                })
                ->whereIn('year_level', [$billingYearLevel, CurriculumFeeAssignment::ALL_YEAR_LEVELS])
                ->where('session_number', $billingSessionNumber)
                ->where('is_approved', true)
                ->with(['feeTemplate.items' => fn ($q) => $q->where('is_active', true)->where('amount', '>', 0)])
                ->orderByRaw('course_curriculum_id = ? desc', [$courseCurriculumId])
                ->orderByRaw('CASE WHEN year_level = ? THEN 0 ELSE 1 END', [$billingYearLevel])
                ->orderByRaw('academic_session_id = ? desc', [$targetSession->id])
                ->first();

            if (!$assignment?->feeTemplate) {
                throw ValidationException::withMessages([
                    'fee_template' => 'No approved fee template is assigned to this course for the current session, year level, and session number.',
                ]);
            }

            if ($assignment->feeTemplate->items->isEmpty()) {
                throw ValidationException::withMessages([
                    'fee_template' => 'The assigned fee template has no active fee components.',
                ]);
            }

            $invoice = Invoice::create([
                'invoice_number'      => Invoice::generateInvoiceNumber(),
                'student_id'          => $student->id,
                'academic_session_id' => $targetSession->id,
                'fee_template_id'     => $assignment->fee_template_id,
                'invoice_type'        => 'fees',
                'status'              => 'issued',
                'issue_date'          => now()->toDateString(),
                'due_date'            => now()->addDays(30)->toDateString(),
                'amount_due'          => 0,
                'computed_amount'     => 0,
                'idempotency_key'     => $idempotencyKey,
                'created_by'          => $createdBy,
            ]);

            $templateItems = $assignment->feeTemplate->items->values();
            $templateTotal = (float) $templateItems->sum('amount');
            $invoiceTotal = $assignment->issuance_type === 'per_year'
                ? (float) $assignment->split_amount
                : $templateTotal;
            $allocatedLineTotal = 0.0;

            foreach ($templateItems as $index => $item) {
                $lineAmount = $index === $templateItems->count() - 1
                    ? round($invoiceTotal - $allocatedLineTotal, 2)
                    : round($invoiceTotal * ((float) $item->amount / $templateTotal), 2);
                $allocatedLineTotal += $lineAmount;

                InvoiceLineItem::create([
                    'invoice_id' => $invoice->id,
                    'fee_template_item_id' => $item->id,
                    'name' => $item->name,
                    'description' => $item->description,
                    'amount' => $lineAmount,
                    'quantity' => 1,
                    'total_amount' => $lineAmount,
                    'snapshot_data' => [
                        'template_code' => $assignment->feeTemplate->code,
                        'template_name' => $assignment->feeTemplate->name,
                        'item_name' => $item->name,
                        'template_item_amount' => (float) $item->amount,
                        'billed_item_amount' => $lineAmount,
                        'issuance_type' => $assignment->issuance_type,
                        'annual_split_amount' => $assignment->split_amount,
                        'annual_split_ratio' => $assignment->split_ratio,
                        'course_curriculum_id' => $courseCurriculumId,
                        'academic_session_id' => $targetSession->id,
                        'year_level' => $billingYearLevel,
                        'session_number' => $billingSessionNumber,
                        'snapshot_taken_at' => now()->toDateTimeString(),
                    ],
                ]);
            }

            if (!$assignment->feeTemplate->is_issued) {
                $assignment->feeTemplate->update(['is_issued' => true]);
            }

            $invoice->recalculateTotals();

            $this->postLedgerEntry([
                'student_id'          => $student->id,
                'invoice_id'          => $invoice->id,
                'academic_session_id' => $targetSession->id,
                'type'                => 'invoice',
                'debit'               => (float) $invoice->amount_due,
                'credit'              => 0,
                'reference'           => $invoice->invoice_number,
                'description'         => 'Invoice issued on session registration.',
                'transaction_date'    => now()->toDateString(),
                'created_by'          => $createdBy,
            ], "ledger:invoice:{$invoice->id}");

            $this->applyAvailableCredits($invoice, $createdBy);

            $this->syncAccountBalance($student->id, $targetSession->id);

            $this->auditLog(
                $student,
                FinanceAuditAction::INVOICE_CREATED,
                'invoice',
                $invoice->id,
                [
                    'invoice_number' => $invoice->invoice_number,
                    'amount' => (float) $invoice->amount_due,
                    'session_id' => $targetSession->id,
                ]
            );

            return $invoice->fresh();
        });
    }

    public function createHostelInvoiceForStudent(
        Student $student,
        Hostel $hostel,
        ?string $createdBy = null
    ): Invoice {
        $targetSession = AcademicSession::query()
            ->where('is_active', true)
                ->whereHas('year', fn ($query) => $query->where('is_active', true))
            ->latest('start_date')
            ->first();

        if (!$targetSession) {
            throw ValidationException::withMessages([
                'session' => 'No active academic session found.',
            ]);
        }

        return DB::transaction(function () use ($student, $hostel, $targetSession, $createdBy) {

            $idempotencyKey = "hostel:{$student->id}:{$hostel->id}:{$targetSession->id}";

            $existingInvoice = Invoice::query()
                ->where('idempotency_key', $idempotencyKey)
                ->where('status', '!=', 'cancelled')
                ->first();

            if ($existingInvoice) {
                return $existingInvoice;
            }

            $invoice = Invoice::create([
                'invoice_number'      => Invoice::generateInvoiceNumber(),
                'student_id'          => $student->id,
                'academic_session_id' => $targetSession->id,
                'invoice_type'        => 'hostel',
                'status'              => 'issued',
                'issue_date'          => now()->toDateString(),
                'due_date'            => now()->addDays(14)->toDateString(),
                'amount_due'          => 0,
                'computed_amount'     => 0,
                'notes'               => "Hostel Accommodation — {$hostel->name} ({$hostel->code})",
                'idempotency_key'     => $idempotencyKey,
                'created_by'          => $createdBy,
            ]);

            InvoiceLineItem::create([
                'invoice_id'           => $invoice->id,
                'fee_template_item_id' => null,
                'name'                 => "Hostel Accommodation — {$hostel->name}",
                'description'          => null,
                'amount'               => (float) $hostel->session_fee_amount,
                'quantity'             => 1,
                'total_amount'         => (float) $hostel->session_fee_amount,
                'snapshot_data'        => [
                    'hostel_id'           => $hostel->id,
                    'hostel_code'         => $hostel->code,
                    'hostel_name'         => $hostel->name,
                    'session_fee_amount'  => (float) $hostel->session_fee_amount,
                    'academic_session_id' => $targetSession->id,
                    'snapshot_taken_at'   => now()->toDateTimeString(),
                ],
            ]);

            $invoice->recalculateTotals();

            $this->postLedgerEntry([
                'student_id'          => $student->id,
                'invoice_id'          => $invoice->id,
                'academic_session_id' => $targetSession->id,
                'type'                => 'invoice',
                'debit'               => (float) $invoice->amount_due,
                'credit'              => 0,
                'reference'           => $invoice->invoice_number,
                'description'         => "Hostel accommodation invoice — {$hostel->name}.",
                'transaction_date'    => now()->toDateString(),
                'created_by'          => $createdBy,
            ], "ledger:invoice:{$invoice->id}");

            $this->applyAvailableCredits($invoice, $createdBy);
            $this->syncAccountBalance($student->id, $targetSession->id);

            return $invoice->fresh();
        });
    }

    public function reverseInvoice(Invoice $invoice, string $reason, string $reversedBy): Invoice
    {
        if (!in_array($invoice->status, ['issued', 'partial'], true)) {
            throw ValidationException::withMessages([
                'invoice' => 'Only invoices with issued or partial status can be reversed.',
            ]);
        }

        return DB::transaction(function () use ($invoice, $reason, $reversedBy) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);
            $studentId = $invoice->student_id;
            $sessionsSynced = [];

            $allocations = InvoicePaymentAllocation::query()
                ->where('invoice_id', $invoice->id)
                ->lockForUpdate()
                ->get();

            foreach ($allocations as $allocation) {
                $this->releaseAllocatedPaymentCredit(
                    $allocation->payment,
                    $invoice,
                    (float) $allocation->amount,
                    'Credit released from reversed invoice.',
                );

                $allocation->delete();

                if ($invoice->academic_session_id) {
                    $sessionsSynced[$invoice->academic_session_id] = true;
                }
            }

            StudentLedgerEntry::create([
                'student_id'          => $studentId,
                'invoice_id'          => $invoice->id,
                'academic_session_id' => $invoice->academic_session_id,
                'type'                => 'invoice_reversal',
                'credit'              => (float) $invoice->amount_due,
                'debit'               => 0,
                'reference'           => $invoice->invoice_number,
                'description'         => 'Invoice reversal - ' . $reason,
                'transaction_date'    => now()->toDateString(),
                'created_by'          => $reversedBy,
            ]);

            $invoice->forceFill([
                'status' => 'cancelled',
            ]);
            $invoice->save();

            if ($invoice->academic_session_id) {
                $sessionsSynced[$invoice->academic_session_id] = true;
            }

            foreach (array_keys($sessionsSynced) as $sessionId) {
                $this->syncAccountBalance($studentId, $sessionId);
            }

            $student = Student::find($studentId);
            if ($student) {
                $this->auditLog(
                    $student,
                    FinanceAuditAction::INVOICE_REVERSED,
                    'invoice',
                    $invoice->id,
                    [
                        'amount'      => (float) $invoice->amount_due,
                        'reason'      => $reason,
                        'reversed_by' => $reversedBy,
                    ]
                );
            }

            return $invoice->fresh();
        });
    }

    public function createStandaloneChargeInvoice(
        Student $student,
        float $amount,
        string $chargeType,
        ?string $description = null,
        ?string $createdBy = null
    ): Invoice {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Invoice amount must be greater than zero.',
            ]);
        }

        if (!in_array($chargeType, ['penalty'], true)) {
            throw ValidationException::withMessages([
                'charge_type' => 'Unsupported charge type.',
            ]);
        }

        return DB::transaction(function () use ($student, $amount, $chargeType, $description, $createdBy) {
            $student = Student::query()->lockForUpdate()->findOrFail($student->id);
            $targetSession = AcademicSession::query()
                ->where('is_active', true)
                ->whereHas('year', fn ($query) => $query->where('is_active', true))
                ->latest('start_date')
                ->first();

            if (!$targetSession) {
                throw ValidationException::withMessages([
                    'session' => 'No active academic session found.',
                ]);
            }

            $label = $chargeType === 'penalty' ? 'Penalty' : ucfirst($chargeType);
            $invoice = Invoice::create([
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'student_id' => $student->id,
                'academic_session_id' => $targetSession->id,
                'fee_template_id' => null,
                'invoice_type' => $chargeType,
                'status' => 'issued',
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(30)->toDateString(),
                'amount_due' => 0,
                'computed_amount' => 0,
                'notes' => $description,
                'created_by' => $createdBy,
            ]);

            InvoiceLineItem::create([
                'invoice_id' => $invoice->id,
                'fee_template_item_id' => null,
                'name' => $label,
                'description' => $description,
                'amount' => $amount,
                'quantity' => 1,
                'total_amount' => $amount,
                'snapshot_data' => [
                    'charge_type' => $chargeType,
                    'manual_amount' => $amount,
                    'snapshot_taken_at' => now()->toDateTimeString(),
                ],
            ]);

            $invoice->recalculateTotals();

            StudentLedgerEntry::create([
                'student_id' => $student->id,
                'invoice_id' => $invoice->id,
                'academic_session_id' => $targetSession->id,
                'type' => 'invoice',
                'debit' => (float) $invoice->amount_due,
                'credit' => 0,
                'reference' => $invoice->invoice_number,
                'description' => $description ?? "{$label} invoice issued.",
                'transaction_date' => now()->toDateString(),
                'created_by' => $createdBy,
            ]);

            $this->applyAvailableCredits($invoice, $createdBy);
            $this->syncAccountBalance($student->id, $targetSession->id);

            return $invoice->fresh(['items']);
        });
    }

    public function calculateCreditBalance(Student $student): float
    {
        $session = AcademicSession::query()
            ->where('is_active', true)
                ->whereHas('year', fn ($query) => $query->where('is_active', true))
            ->latest('start_date')
            ->first();

        if (!$session) return 0;

        $this->syncAccountBalance($student->id, $session->id);

        $balance = StudentAccountBalance::query()
            ->where('student_id', $student->id)
            ->where('academic_session_id', $session->id)
            ->value('balance');

        return max(0, (float) ($balance !== null ? -$balance : 0));
    }

    public function reconcileStudentFinance(Student $student, AcademicSession $session): void
    {
        DB::transaction(function () use ($student, $session) {
            $invoices = Invoice::query()
                ->where('student_id', $student->id)
                ->where('academic_session_id', $session->id)
                ->where('status', '!=', 'cancelled')
                ->get();

            foreach ($invoices as $invoice) {
                $invoice->recalculateTotals();
            }

            $this->syncAccountBalance($student->id, $session->id);
        });
    }

    private function currentActiveSession(): ?AcademicSession
    {
        return AcademicSession::query()
            ->where('is_active', true)
            ->whereHas('year', fn ($query) => $query->where('is_active', true))
            ->latest('start_date')
            ->first();
    }

    private function resolveSessionEnrolment(Student $student, AcademicSession $session): ?AcademicSessionEnrolment
    {
        return AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->where('academic_session_id', $session->id)
            ->latest()
            ->first();
    }

    private function postLedgerEntry(array $data, ?string $idempotencyKey = null): StudentLedgerEntry
    {
        if ($idempotencyKey) {
            $existing = StudentLedgerEntry::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing;
            }
        }

        if ($idempotencyKey) {
            $data['idempotency_key'] = $idempotencyKey;
        }

        return StudentLedgerEntry::create($data);
    }

    private function applyAvailableCredits(Invoice $invoice, ?string $createdBy): void
    {
        $remaining = $this->calculateOutstanding($invoice);

        if ($remaining <= 0) {
            return;
        }

        $unallocatedPayments = Payment::query()
            ->where('student_id', $invoice->student_id)
            ->where('status', 'completed')
            ->get()
            ->filter(fn (Payment $p) => $p->unallocated_amount > 0);

        foreach ($unallocatedPayments as $payment) {
            if ($remaining <= 0) {
                break;
            }

            $allocationAmount = min($remaining, (float) $payment->unallocated_amount);

            InvoicePaymentAllocation::create([
                'payment_id'   => $payment->id,
                'invoice_id'   => $invoice->id,
                'academic_session_id' => $invoice->academic_session_id,
                'amount'       => $allocationAmount,
                'allocated_at' => now()->toDateString(),
            ]);

            $this->allocatePaymentLedgerCredit(
                $payment,
                $invoice,
                $allocationAmount,
                now()->toDateString(),
                $createdBy,
            );

            $invoice->recalculateTotals();

            $remaining = $this->calculateOutstanding($invoice);
        }
    }

    private function allocatePaymentLedgerCredit(
        Payment $payment,
        Invoice $invoice,
        float $amount,
        string $allocatedAt,
        ?string $createdBy
    ): void {
        $remaining = $amount;

        $unallocatedEntries = StudentLedgerEntry::query()
            ->where('payment_id', $payment->id)
            ->where('type', 'payment')
            ->whereNull('invoice_id')
            ->where('credit', '>', 0)
            ->orderBy('created_at')
            ->lockForUpdate()
            ->get();

        foreach ($unallocatedEntries as $entry) {
            if ($remaining <= 0) {
                break;
            }

            $available = (float) $entry->credit;
            $moved = min($remaining, $available);

            if ($moved >= $available) {
                $entry->update([
                    'invoice_id' => $invoice->id,
                    'academic_session_id' => $invoice->academic_session_id,
                    'description' => 'Existing credit applied to new invoice.',
                    'transaction_date' => $allocatedAt,
                    'created_by' => $createdBy ?? $entry->created_by,
                ]);
            } else {
                $entry->update(['credit' => $available - $moved]);

                StudentLedgerEntry::create([
                    'student_id' => $invoice->student_id,
                    'invoice_id' => $invoice->id,
                    'payment_id' => $payment->id,
                    'academic_session_id' => $invoice->academic_session_id,
                    'type' => 'payment',
                    'debit' => 0,
                    'credit' => $moved,
                    'reference' => $payment->reference,
                    'description' => 'Existing credit applied to new invoice.',
                    'transaction_date' => $allocatedAt,
                    'created_by' => $createdBy,
                ]);
            }

            $remaining -= $moved;
        }

        if ($remaining > 0) {
            StudentLedgerEntry::create([
                'student_id' => $invoice->student_id,
                'invoice_id' => $invoice->id,
                'payment_id' => $payment->id,
                'academic_session_id' => $invoice->academic_session_id,
                'type' => 'payment',
                'debit' => 0,
                'credit' => $remaining,
                'reference' => $payment->reference,
                'description' => 'Existing credit applied to new invoice.',
                'transaction_date' => $allocatedAt,
                'created_by' => $createdBy,
            ]);
        }
    }

    private function releaseAllocatedPaymentCredit(?Payment $payment, Invoice $invoice, float $amount, string $description): void
    {
        if (!$payment || $amount <= 0) {
            return;
        }

        $remaining = $amount;

        $allocatedEntries = StudentLedgerEntry::query()
            ->where('payment_id', $payment->id)
            ->where('invoice_id', $invoice->id)
            ->where('type', 'payment')
            ->where('credit', '>', 0)
            ->orderBy('created_at')
            ->lockForUpdate()
            ->get();

        foreach ($allocatedEntries as $entry) {
            if ($remaining <= 0) {
                break;
            }

            $available = (float) $entry->credit;
            $released = min($remaining, $available);

            if ($released >= $available) {
                $entry->update([
                    'invoice_id' => null,
                    'description' => $description,
                ]);
            } else {
                $entry->update(['credit' => $available - $released]);

                StudentLedgerEntry::create([
                    'student_id' => $invoice->student_id,
                    'payment_id' => $payment->id,
                    'academic_session_id' => $invoice->academic_session_id,
                    'type' => 'payment',
                    'debit' => 0,
                    'credit' => $released,
                    'reference' => $payment->reference,
                    'description' => $description,
                    'transaction_date' => $entry->transaction_date,
                    'created_by' => $entry->created_by,
                ]);
            }

            $remaining -= $released;
        }

        if ($remaining > 0) {
            StudentLedgerEntry::create([
                'student_id' => $invoice->student_id,
                'payment_id' => $payment->id,
                'academic_session_id' => $invoice->academic_session_id,
                'type' => 'payment',
                'debit' => 0,
                'credit' => $remaining,
                'reference' => $payment->reference,
                'description' => $description,
                'transaction_date' => now()->toDateString(),
                'created_by' => $payment->created_by,
            ]);
        }
    }
}
