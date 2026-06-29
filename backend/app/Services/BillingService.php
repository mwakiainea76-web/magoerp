<?php

namespace App\Services;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CurriculumFeeAssignment;
use App\Models\Hostel;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\InvoicePaymentAllocation;
use App\Models\Payment;
use App\Models\Student;
use App\Models\StudentAccountBalance;
use App\Models\StudentFeeAdjustment;
use App\Models\StudentLedgerEntry;
use App\Models\SystemConfiguration;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BillingService
{
    // -------------------------------------------------------------------------
    // CREDIT ADJUSTMENT TYPES
    // These types reduce what the student owes (posted as ledger credits).
    // All other adjustment types are treated as debits (increase what is owed).
    // -------------------------------------------------------------------------
    private const CREDIT_ADJUSTMENT_TYPES = ['discount', 'waiver', 'bursary', 'helb', 'reversal'];

    // =========================================================================
    // INVOICE CREATION
    // =========================================================================

    /**
     * Create a fee invoice for a student when they register for a session.
     *
     * Rules:
     *  - Student must have an active course enrolment with a curriculum assigned.
     *  - Student must already be registered for the target academic session
     *    (AcademicSessionEnrolment must exist) before invoicing.
     *  - An approved CurriculumFeeAssignment must exist for the student's
     *    curriculum + session + year_level + session_number combination.
     *  - Idempotent: returns the existing invoice if already issued.
     *  - After creation, any unallocated payments the student already has
     *    are automatically applied to the new invoice.
     */
    public function createInvoiceForStudent(
        Student $student,
        ?string $createdBy = null,
        ?AcademicSession $session = null,
        ?string $invoiceTemplateId = null
    ): Invoice {
        $billingPeriod = SystemConfiguration::getValue('billing_period', 'session');

        return DB::transaction(function () use ($student, $createdBy, $session, $billingPeriod, $invoiceTemplateId) {

            // 1. Resolve the student's active curriculum
            $courseCurriculumId = $student->courseEnrolments()
                ->where('status', 'enrolled')
                ->latest()
                ->value('course_curriculum_id');

            if (!$courseCurriculumId) {
                throw ValidationException::withMessages([
                    'course' => 'Student has no course curriculum assigned.',
                ]);
            }

            // 2. Resolve the target academic session
            $targetSession = $session ?? AcademicSession::query()
                ->where('is_active', true)
                ->latest('start_date')
                ->first();

            if (!$targetSession) {
                throw ValidationException::withMessages([
                    'session' => 'No active academic session found.',
                ]);
            }

            // 3. Confirm the student is registered for this session
            //    (registration is the trigger for invoicing — not admission)
            $enrolment = $this->resolveSessionEnrolment($student, $targetSession);

            if (!$enrolment) {
                throw ValidationException::withMessages([
                    'session' => 'Student must be registered for the academic session before an invoice can be issued.',
                ]);
            }

            // 4. Build the idempotency key and check for an existing invoice
            //    ONE check only — no duplicate check further down.
            $idempotencyKey = $billingPeriod === 'annual'
                ? "fees:{$student->id}:year{$enrolment->year_of_study}:annual"
                : "fees:{$student->id}:{$targetSession->id}";

            $existingInvoice = Invoice::query()
                ->where('idempotency_key', $idempotencyKey)
                ->where('status', '!=', 'cancelled')
                ->first();

            if ($existingInvoice) {
                return $existingInvoice;
            }

            // 5. Find the approved fee assignment for this student's position
            $assignment = CurriculumFeeAssignment::query()
                ->when(
                    $invoiceTemplateId,
                    fn ($q) => $q->whereHas('feeTemplate', fn ($q) => $q->where('id', $invoiceTemplateId))
                )
                ->where('course_curriculum_id', $courseCurriculumId)
                ->where('academic_session_id', $targetSession->id)
                ->where('year_level', $enrolment->year_of_study)
                ->where('session_number', $enrolment->session_number)
                ->where('is_approved', true)
                ->with(['feeTemplate.items' => fn ($q) => $q->where('is_active', true)])
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

            // 6. Create the invoice (amount_due starts at 0; recalculated after line items)
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

            // 7. Snapshot line items from the fee template
            foreach ($assignment->feeTemplate->items as $item) {
                InvoiceLineItem::create([
                    'invoice_id'           => $invoice->id,
                    'fee_template_item_id' => $item->id,
                    'name'                 => $item->name,
                    'description'          => $item->description,
                    'amount'               => $item->amount,
                    'quantity'             => 1,
                    'total_amount'         => $item->amount,
                    'snapshot_data'        => [
                        'template_code'        => $assignment->feeTemplate->code,
                        'template_name'        => $assignment->feeTemplate->name,
                        'item_name'            => $item->name,
                        'item_amount'          => $item->amount,
                        'item_description'     => $item->description,
                        'course_curriculum_id' => $courseCurriculumId,
                        'academic_session_id'  => $targetSession->id,
                        'year_level'           => $enrolment->year_of_study,
                        'session_number'       => $enrolment->session_number,
                        'snapshot_taken_at'    => now()->toDateTimeString(),
                    ],
                ]);
            }

            // 8. Mark the template as issued (if not already)
            if (!$assignment->feeTemplate->is_issued) {
                $assignment->feeTemplate->update(['is_issued' => true]);
            }

            // 9. Recalculate invoice totals from line items
            $invoice->recalculateTotals();

            // 10. Post debit ledger entry (student now owes this amount)
            StudentLedgerEntry::create([
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
            ]);

            // 11. Apply any existing unallocated credits to the new invoice
            $this->applyAvailableCredits($invoice, $createdBy);

            // 12. Sync the account balance snapshot (AFTER ledger entry is written)
            $this->syncAccountBalance($student->id, $targetSession->id);

            return $invoice->fresh();
        });
    }

    /**
     * Create a hostel accommodation invoice for a student.
     *
     * Unlike course fee invoices, hostel invoices are not tied to a
     * CurriculumFeeAssignment — they use the hostel's session_fee_amount directly.
     */
    public function createHostelInvoiceForStudent(
        Student $student,
        Hostel $hostel,
        ?string $createdBy = null
    ): Invoice {
        $targetSession = AcademicSession::query()
            ->where('is_active', true)
            ->latest('start_date')
            ->first();

        if (!$targetSession) {
            throw ValidationException::withMessages([
                'session' => 'No active academic session found.',
            ]);
        }

        return DB::transaction(function () use ($student, $hostel, $targetSession, $createdBy) {

            // Idempotency: one hostel invoice per student per hostel per session
            $idempotencyKey = "hostel:{$student->id}:{$hostel->id}:{$targetSession->id}";

            $existingInvoice = Invoice::query()
                ->where('idempotency_key', $idempotencyKey)
                ->where('status', '!=', 'cancelled')
                ->first();

            if ($existingInvoice) {
                return $existingInvoice;
            }

            // 1. Create the invoice
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

            // 2. Create the single line item from the hostel fee
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

            // 3. Recalculate totals after line items are written
            $invoice->recalculateTotals();

            // 4. Post debit ledger entry
            StudentLedgerEntry::create([
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
            ]);

            // 5. Sync account balance AFTER the ledger entry is written
            $this->syncAccountBalance($student->id, $targetSession->id);

            return $invoice->fresh();
        });
    }

    // =========================================================================
    // PAYMENT RECORDING
    // =========================================================================

    /**
     * Record a payment against a specific invoice.
     *
     * Use this when the admin is paying off a known invoice directly.
     * The payment amount is allocated up to the invoice's outstanding balance.
     * Any excess amount beyond the invoice balance is recorded but not allocated.
     */
    public function recordPayment(
        Invoice $invoice,
        float $amount,
        string $method,
        ?string $createdBy,
        ?string $reference = null,
        ?string $paymentDate = null,
        ?string $notes = null
    ): Payment {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Payment amount must be greater than zero.',
            ]);
        }

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages([
                'invoice' => 'Cannot record a payment against a cancelled invoice.',
            ]);
        }

        return DB::transaction(function () use ($invoice, $amount, $method, $createdBy, $reference, $paymentDate, $notes) {

            // Lock the invoice row to prevent concurrent payment race conditions
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            // Idempotency: same student + reference = same payment
            $idempotencyKey = $reference
                ? "pay:{$invoice->student_id}:{$reference}"
                : null;

            if ($idempotencyKey) {
                $existing = Payment::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing;
                }
            }

            // 1. Record the payment
            $payment = Payment::create([
                'student_id'      => $invoice->student_id,
                'amount'          => $amount,
                'payment_date'    => $paymentDate ?? now()->toDateString(),
                'method'          => $method,
                'reference'       => $reference,
                'status'          => 'completed',
                'idempotency_key' => $idempotencyKey,
                'created_by'      => $createdBy,
                'notes'           => $notes,
            ]);

            // 2. Calculate how much of this invoice is still outstanding
            $allocationAmount = $this->calculateOutstanding($invoice);
            $allocationAmount = min($amount, $allocationAmount);

            if ($allocationAmount > 0) {
                // 3. Allocate to the invoice
                InvoicePaymentAllocation::create([
                    'payment_id'   => $payment->id,
                    'invoice_id'   => $invoice->id,
                    'amount'       => $allocationAmount,
                    'allocated_at' => $paymentDate ?? now()->toDateString(),
                ]);

                // 4. Update invoice status (issued / partial / paid)
                $invoice->recalculateTotals();

                // 5. Post credit ledger entry
                StudentLedgerEntry::create([
                    'student_id'          => $invoice->student_id,
                    'invoice_id'          => $invoice->id,
                    'payment_id'          => $payment->id,
                    'academic_session_id' => $invoice->academic_session_id,
                    'type'                => 'payment',
                    'debit'               => 0,
                    'credit'              => $allocationAmount,
                    'reference'           => $payment->reference,
                    'description'         => 'Payment received and allocated to invoice.',
                    'transaction_date'    => $paymentDate ?? now()->toDateString(),
                    'created_by'          => $createdBy,
                ]);

                // 6. Sync balance snapshot
                $this->syncAccountBalance($invoice->student_id, $invoice->academic_session_id);
            }

            return $payment;
        });
    }

    /**
     * Record a payment at the student level, auto-allocating across
     * all outstanding invoices oldest-first.
     *
     * Use this when a student pays a lump sum without specifying an invoice.
     * Excess payment beyond all invoices is recorded but left unallocated
     * (acts as a credit that will be applied to future invoices).
     */
    public function recordStudentPayment(
        Student $student,
        float $amount,
        string $method,
        ?string $createdBy,
        ?string $reference = null,
        ?string $paymentDate = null,
        ?string $notes = null
    ): Payment {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Payment amount must be greater than zero.',
            ]);
        }

        return DB::transaction(function () use ($student, $amount, $method, $createdBy, $reference, $paymentDate, $notes) {

            // Idempotency check
            $idempotencyKey = $reference
                ? "pay:{$student->id}:{$reference}"
                : null;

            if ($idempotencyKey) {
                $existing = Payment::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing;
                }
            }

            // 1. Record the payment
            $payment = Payment::create([
                'student_id'      => $student->id,
                'amount'          => $amount,
                'payment_date'    => $paymentDate ?? now()->toDateString(),
                'method'          => $method,
                'reference'       => $reference,
                'status'          => 'completed',
                'idempotency_key' => $idempotencyKey,
                'created_by'      => $createdBy,
                'notes'           => $notes,
            ]);

            // 2. Allocate across outstanding invoices, oldest first
            $remaining = $amount;
            $sessionsSynced = [];

            $invoices = Invoice::query()
                ->where('student_id', $student->id)
                ->whereIn('status', ['issued', 'partial'])
                ->orderBy('issue_date')
                ->orderBy('created_at')
                ->lockForUpdate()
                ->get();

            foreach ($invoices as $invoice) {
                if ($remaining <= 0) {
                    break;
                }

                $outstanding = $this->calculateOutstanding($invoice);

                if ($outstanding <= 0) {
                    // Invoice may already be fully paid — ensure status is correct
                    $invoice->recalculateTotals();
                    continue;
                }

                $allocationAmount = min($remaining, $outstanding);

                InvoicePaymentAllocation::create([
                    'payment_id'   => $payment->id,
                    'invoice_id'   => $invoice->id,
                    'amount'       => $allocationAmount,
                    'allocated_at' => $paymentDate ?? now()->toDateString(),
                ]);

                $invoice->recalculateTotals();

                StudentLedgerEntry::create([
                    'student_id'          => $student->id,
                    'invoice_id'          => $invoice->id,
                    'payment_id'          => $payment->id,
                    'academic_session_id' => $invoice->academic_session_id,
                    'type'                => 'payment',
                    'debit'               => 0,
                    'credit'              => $allocationAmount,
                    'reference'           => $reference,
                    'description'         => 'Payment received and allocated.',
                    'transaction_date'    => $paymentDate ?? now()->toDateString(),
                    'created_by'          => $createdBy,
                ]);

                $remaining -= $allocationAmount;

                // Track which sessions need a balance sync
                if ($invoice->academic_session_id) {
                    $sessionsSynced[$invoice->academic_session_id] = true;
                }
            }

            // 3. Sync balance for every session that was touched
            //    Always runs — even if no invoices were found, the payment
            //    exists and the balance snapshot should reflect it.
            if (empty($sessionsSynced)) {
                // Payment recorded but no invoices to allocate against.
                // Sync the current active session so the credit is visible.
                $activeSession = AcademicSession::query()
                    ->where('is_active', true)
                    ->latest('start_date')
                    ->value('id');

                if ($activeSession) {
                    $this->syncAccountBalance($student->id, $activeSession);
                }
            } else {
                foreach (array_keys($sessionsSynced) as $sessionId) {
                    $this->syncAccountBalance($student->id, $sessionId);
                }
            }

            return $payment;
        });
    }

    // =========================================================================
    // ADJUSTMENTS (DISCOUNTS / WAIVERS / BURSARIES / PENALTIES)
    // =========================================================================

    /**
     * Apply a fee adjustment to an invoice.
     *
     * Credit types  (reduce what the student owes): discount, waiver, bursary, helb, reversal
     * Debit types   (increase what the student owes): penalty, fine, etc.
     *
     * Every adjustment is posted to the ledger and the ledger_posted flag
     * is set to true atomically within the same transaction.
     */
    public function applyAdjustment(
        Invoice $invoice,
        string $type,
        float $amount,
        ?string $createdBy,
        ?string $description = null
    ): StudentFeeAdjustment {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Adjustment amount must be greater than zero.',
            ]);
        }

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages([
                'invoice' => 'Cannot apply an adjustment to a cancelled invoice.',
            ]);
        }

        return DB::transaction(function () use ($invoice, $type, $amount, $createdBy, $description) {

            // Lock invoice row
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            $isCredit = in_array($type, self::CREDIT_ADJUSTMENT_TYPES);

            // 1. Create adjustment record (ledger_posted starts false)
            $adjustment = StudentFeeAdjustment::create([
                'invoice_id'      => $invoice->id,
                'type'            => $type,
                'amount'          => $amount,
                'idempotency_key' => "adj:{$invoice->id}:{$type}:" . now()->format('YmdHisv'),
                'description'     => $description,
                'applied_at'      => now()->toDateString(),
                'ledger_posted'   => false,
                'created_by'      => $createdBy,
            ]);

            // 2. Post to ledger with direct adjustment_id traceability
            StudentLedgerEntry::create([
                'student_id'          => $invoice->student_id,
                'invoice_id'          => $invoice->id,
                'adjustment_id'       => $adjustment->id,
                'academic_session_id' => $invoice->academic_session_id,
                'type'                => 'adjustment',
                'debit'               => $isCredit ? 0 : $amount,
                'credit'              => $isCredit ? $amount : 0,
                'description'         => $description ?? ucfirst($type) . ' adjustment applied.',
                'transaction_date'    => now()->toDateString(),
                'created_by'          => $createdBy,
            ]);

            // 3. Mark as posted — atomic within this transaction
            $adjustment->update(['ledger_posted' => true]);

            // 4. Recalculate invoice status
            $invoice->recalculateTotals();

            // 5. Sync balance snapshot
            $this->syncAccountBalance($invoice->student_id, $invoice->academic_session_id);

            return $adjustment->fresh();
        });
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Resolve the student's AcademicSessionEnrolment for the given session.
     */
    private function resolveSessionEnrolment(Student $student, AcademicSession $session): ?AcademicSessionEnrolment
    {
        return AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->where('academic_session_id', $session->id)
            ->latest()
            ->first();
    }

    /**
     * Calculate the outstanding balance on a single invoice.
     *
     * outstanding = amount_due + debit_adjustments - credit_adjustments - allocated_payments
     *
     * Uses fresh DB queries to avoid stale in-memory sums.
     */
    private function calculateOutstanding(Invoice $invoice): float
    {
        $allocated = (float) $invoice->paymentAllocations()->sum('amount');
        $credits   = (float) $invoice->adjustments()->whereIn('type', self::CREDIT_ADJUSTMENT_TYPES)->sum('amount');
        $debits    = (float) $invoice->adjustments()->whereNotIn('type', self::CREDIT_ADJUSTMENT_TYPES)->sum('amount');

        return max(0, (float) $invoice->amount_due + $debits - $credits - $allocated);
    }

    /**
     * Apply any unallocated payments the student already has to a newly created invoice.
     *
     * This handles the case where a student paid in advance before their invoice
     * was generated. Called at the end of createInvoiceForStudent().
     */
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
                'amount'       => $allocationAmount,
                'allocated_at' => now()->toDateString(),
            ]);

            StudentLedgerEntry::create([
                'student_id'          => $invoice->student_id,
                'invoice_id'          => $invoice->id,
                'payment_id'          => $payment->id,
                'academic_session_id' => $invoice->academic_session_id,
                'type'                => 'payment',
                'debit'               => 0,
                'credit'              => $allocationAmount,
                'reference'           => $payment->reference,
                'description'         => 'Existing credit applied to new invoice.',
                'transaction_date'    => now()->toDateString(),
                'created_by'          => $createdBy,
            ]);

            $invoice->recalculateTotals();

            // Re-fetch outstanding after each allocation using fresh DB queries
            $remaining = $this->calculateOutstanding($invoice);
        }
    }

    /**
     * Rebuild the student_account_balances snapshot from the ledger.
     *
     * This recalculates from scratch rather than incrementing, making it
     * self-correcting — any prior inconsistency is fixed on the next write.
     *
     * Formula:
     *   balance = total_invoiced - total_paid - total_adjustments
     *
     * Where total_adjustments = net of credit adjustments minus debit adjustments.
     * A net positive total_adjustments means the student has been given concessions.
     */
    private function syncAccountBalance(string $studentId, ?string $academicSessionId): void
    {
        if (!$academicSessionId) {
            return;
        }

        $ledger = StudentLedgerEntry::query()
            ->where('student_id', $studentId)
            ->where('academic_session_id', $academicSessionId);

        $totalInvoiced = (float) (clone $ledger)
            ->where('type', 'invoice')
            ->sum('debit');

        $totalPaid = (float) (clone $ledger)
            ->where('type', 'payment')
            ->sum('credit');

        // Adjustments: credit types reduce the balance, debit types increase it.
        // total_adjustments is stored as a net credit figure.
        // A positive value means more was forgiven than penalised.
        $adjustmentCredits = (float) (clone $ledger)
            ->where('type', 'adjustment')
            ->whereNotNull('adjustment_id')
            ->sum('credit');

        $adjustmentDebits = (float) (clone $ledger)
            ->where('type', 'adjustment')
            ->whereNotNull('adjustment_id')
            ->sum('debit');

        $totalAdjustments = $adjustmentCredits - $adjustmentDebits;

        StudentAccountBalance::updateOrCreate(
            [
                'student_id'          => $studentId,
                'academic_session_id' => $academicSessionId,
            ],
            [
                'total_invoiced'      => $totalInvoiced,
                'total_paid'          => $totalPaid,
                'total_adjustments'   => $totalAdjustments,
                'balance'             => $totalInvoiced - $totalPaid - $totalAdjustments,
                'last_transaction_at' => now(),
            ]
        );
    }
}