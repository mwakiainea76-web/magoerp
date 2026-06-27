<?php

namespace App\Services;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CourseInvoiceTemplate;
use App\Models\InvoiceAdjustment;
use App\Models\Hostel;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\LedgerTransaction;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Student;
use App\Models\SystemConfiguration;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BillingService
{
    public function createInvoiceForStudent(Student $student, ?string $createdBy = null, ?AcademicSession $session = null, ?string $invoiceTemplateId = null): Invoice
    {
        $billingPeriod = SystemConfiguration::getValue('billing_period', 'session');

        return DB::transaction(function () use ($student, $createdBy, $session, $billingPeriod, $invoiceTemplateId) {
            $courseCurriculumId = $student->courseEnrolments()
                    ->where('status', 'enrolled')
                    ->latest()
                    ->value('course_curriculum_id');

            if (!$courseCurriculumId) {
                throw ValidationException::withMessages([
                    'course' => 'Student has no course curriculum assigned.',
                ]);
            }

            $targetSession = $session ?? AcademicSession::query()
                ->where('is_active', true)
                ->latest('start_date')
                ->first();

            if (!$targetSession) {
                throw ValidationException::withMessages([
                    'session' => 'No active academic session.',
                ]);
            }

            $enrolment = $this->studentSessionEnrolment($student, $targetSession);

            $courseInvoiceTemplate = $invoiceTemplateId
                ? CourseInvoiceTemplate::query()
                    ->whereHas('invoiceTemplate', fn ($q) => $q->where('id', $invoiceTemplateId))
                    ->where('course_curriculum_id', $courseCurriculumId)
                    ->with(['invoiceTemplate.items' => fn ($query) => $query->where('is_active', true)])
                    ->first()
                : CourseInvoiceTemplate::query()
                    ->where('course_curriculum_id', $courseCurriculumId)
                    ->where('is_approved', true)
                    ->when($enrolment, function ($query, AcademicSessionEnrolment $enrolment) use ($billingPeriod) {
                        $query->where('year_level', $enrolment->year_of_study);

                        if ($billingPeriod === 'session') {
                            $query->where('session_number', $enrolment->session_number);
                        }
                    })
                    ->where(function ($query) use ($targetSession) {
                        $query->where('academic_session_id', $targetSession->id)
                            ->orWhereNull('academic_session_id');
                    })
                    ->with(['invoiceTemplate.items' => fn ($query) => $query->where('is_active', true)])
                    ->orderByRaw('academic_session_id = ? desc', [$targetSession->id])
                    ->first();

            if (!$courseInvoiceTemplate?->invoiceTemplate) {
                throw ValidationException::withMessages([
                    'invoice_template' => 'No invoice template assigned to this course.',
                ]);
            }

            if ($courseInvoiceTemplate->invoiceTemplate->items->isEmpty()) {
                throw ValidationException::withMessages([
                    'invoice_template' => 'The assigned invoice template has no active fee components.',
                ]);
            }

            if ($billingPeriod === 'annual') {
                $yearOfStudy = $enrolment?->year_of_study ?? 1;
                $idempotencyKey = "fees:{$student->id}:year{$yearOfStudy}:annual";

                $existingInvoice = Invoice::query()
                    ->where('idempotency_key', $idempotencyKey)
                    ->where('status', '!=', 'cancelled')
                    ->latest()
                    ->first();
            } else {
                $idempotencyKey = "fees:{$student->id}:{$targetSession->id}";

                $existingInvoice = Invoice::query()
                    ->where('student_id', $student->id)
                    ->where('academic_session_id', $targetSession->id)
                    ->where('invoice_type', 'fees')
                    ->where('status', '!=', 'cancelled')
                    ->latest()
                    ->first();
            }

            if ($existingInvoice) {
                return $existingInvoice;
            }

            $invoice = Invoice::create([
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'student_id' => $student->id,
                'academic_session_id' => $targetSession->id,
                'invoice_type' => 'fees',
                'status' => 'issued',
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(30)->toDateString(),
                'amount_due' => 0,
                'idempotency_key' => $idempotencyKey,
                'created_by' => $createdBy,
            ]);

            foreach ($courseInvoiceTemplate->invoiceTemplate->items as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'invoice_template_item_id' => $item->id,
                    'name' => $item->name,
                    'description' => $item->description,
                    'amount' => $item->amount,
                    'quantity' => 1,
                    'total_amount' => $item->amount,
                    'snapshot_data' => [
                        'template_code' => $courseInvoiceTemplate->invoiceTemplate->code,
                        'template_name' => $courseInvoiceTemplate->invoiceTemplate->name,
                        'item_name' => $item->name,
                        'item_amount' => $item->amount,
                        'item_description' => $item->description,
                        'course_curriculum_id' => $courseCurriculumId,
                        'academic_session_id' => $targetSession->id,
                        'snapshot_taken_at' => now()->toDateTimeString(),
                    ],
                ]);
            }

            if (!$courseInvoiceTemplate->invoiceTemplate->is_issued) {
                $courseInvoiceTemplate->invoiceTemplate->update(['is_issued' => true]);
            }

            $invoice->recalculateTotals();

            LedgerTransaction::create([
                'student_id' => $student->id,
                'invoice_id' => $invoice->id,
                'academic_session_id' => $targetSession->id,
                'type' => 'invoice',
                'debit' => (float) $invoice->amount_due,
                'credit' => 0,
                'reference' => $invoice->invoice_number,
                'description' => 'Invoice generated from invoice template.',
                'transaction_date' => now()->toDateString(),
                'created_by' => $createdBy,
            ]);

            $this->applyAvailableCredits($invoice, $createdBy);

            return $invoice->fresh();
        });
    }

    private function studentSessionEnrolment(Student $student, AcademicSession $session): ?AcademicSessionEnrolment
    {
        return AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->where('academic_session_id', $session->id)
            ->latest()
            ->first();
    }

    public function recordPayment(Invoice $invoice, float $amount, string $method, int $createdBy, ?string $reference = null, ?string $paymentDate = null, ?string $notes = null): Payment
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
        }

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages(['invoice' => 'Payment cannot be recorded against a cancelled invoice.']);
        }

        return DB::transaction(function () use ($invoice, $amount, $method, $createdBy, $reference, $paymentDate, $notes) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'student_id' => $invoice->student_id,
                'amount' => $amount,
                'payment_date' => $paymentDate ?? now()->toDateString(),
                'method' => $method,
                'reference' => $reference,
                'status' => 'completed',
                'created_by' => $createdBy,
                'notes' => $notes,
            ]);

            $allocatedTotal = (float) $invoice->paymentAllocations()->sum('amount');
            $balanceDue = (float) $invoice->amount_due - $allocatedTotal;
            $allocationAmount = min($amount, max(0, $balanceDue));

            if ($allocationAmount > 0) {
                PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'invoice_id' => $invoice->id,
                    'amount' => $allocationAmount,
                    'allocated_at' => now()->toDateString(),
                ]);

                $invoice->recalculateTotals();

                LedgerTransaction::create([
                    'student_id' => $invoice->student_id,
                    'invoice_id' => $invoice->id,
                    'academic_session_id' => $invoice->academic_session_id,
                    'type' => 'payment',
                    'debit' => 0,
                    'credit' => $allocationAmount,
                    'reference' => $payment->reference,
                    'description' => 'Payment allocated.',
                    'transaction_date' => now()->toDateString(),
                    'created_by' => $createdBy,
                ]);
            }

            return $payment;
        });
    }

    public function recordStudentPayment(Student $student, float $amount, string $method, string $createdBy, ?string $reference = null, ?string $paymentDate = null, ?string $notes = null): Payment
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
        }

        return DB::transaction(function () use ($student, $amount, $method, $createdBy, $reference, $paymentDate, $notes) {
            $payment = Payment::create([
                'student_id' => $student->id,
                'amount' => $amount,
                'payment_date' => $paymentDate ?? now()->toDateString(),
                'method' => $method,
                'reference' => $reference,
                'status' => 'completed',
                'created_by' => $createdBy,
                'notes' => $notes,
            ]);

            LedgerTransaction::create([
                'student_id' => $student->id,
                'type' => 'payment',
                'debit' => 0,
                'credit' => $amount,
                'reference' => $reference,
                'description' => 'Student payment recorded.',
                'transaction_date' => now()->toDateString(),
                'created_by' => $createdBy,
            ]);

            return $payment;
        });
    }

    public function applyAdjustment(Invoice $invoice, string $type, float $amount, int $createdBy, ?string $description = null): InvoiceAdjustment
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
        }

        return DB::transaction(function () use ($invoice, $type, $amount, $createdBy, $description) {
            $adjustment = InvoiceAdjustment::create([
                'invoice_id' => $invoice->id,
                'type' => $type,
                'amount' => $amount,
                'description' => $description,
                'applied_at' => now()->toDateString(),
                'created_by' => $createdBy,
            ]);

            $invoice->recalculateTotals();

            $isCredit = in_array($type, ['discount', 'waiver', 'bursary', 'helb', 'reversal']);

            LedgerTransaction::create([
                'student_id' => $invoice->student_id,
                'invoice_id' => $invoice->id,
                'academic_session_id' => $invoice->academic_session_id,
                'type' => $type,
                'debit' => $isCredit ? 0 : $amount,
                'credit' => $isCredit ? $amount : 0,
                'description' => $description ?? ucfirst($type) . ' adjustment.',
                'transaction_date' => now()->toDateString(),
                'created_by' => $createdBy,
            ]);

            return $adjustment;
        });
    }

    public function createHostelInvoiceForStudent(Student $student, Hostel $hostel, ?int $createdBy = null): Invoice
    {
        $targetSession = AcademicSession::query()
            ->where('is_active', true)
            ->latest('start_date')
            ->first();

        if (!$targetSession) {
            throw ValidationException::withMessages([
                'session' => 'No active academic session.',
            ]);
        }

        return DB::transaction(function () use ($student, $hostel, $targetSession, $createdBy) {
            $invoice = Invoice::create([
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'student_id' => $student->id,
                'academic_session_id' => $targetSession->id,
                'invoice_type' => 'hostel',
                'status' => 'issued',
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(14)->toDateString(),
                'amount_due' => 0,
                'notes' => "Hostel Accommodation - {$hostel->name} ({$hostel->code})",
                'idempotency_key' => "student-hostel-booking:{$student->id}:{$hostel->id}:{$targetSession->id}",
                'created_by' => $createdBy,
            ]);

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'invoice_template_item_id' => null,
                'name' => "Hostel Accommodation - {$hostel->name}",
                'amount' => (float) $hostel->session_fee_amount,
                'quantity' => 1,
                'total_amount' => (float) $hostel->session_fee_amount,
                'snapshot_data' => [
                    'hostel_id' => $hostel->id,
                    'hostel_code' => $hostel->code,
                    'hostel_name' => $hostel->name,
                    'session_fee_amount' => (float) $hostel->session_fee_amount,
                    'academic_session_id' => $targetSession->id,
                    'snapshot_taken_at' => now()->toDateTimeString(),
                ],
            ]);

            $invoice->recalculateTotals();

            LedgerTransaction::create([
                'student_id' => $student->id,
                'invoice_id' => $invoice->id,
                'academic_session_id' => $targetSession->id,
                'type' => 'invoice',
                'debit' => (float) $invoice->amount_due,
                'credit' => 0,
                'reference' => $invoice->invoice_number,
                'description' => "Hostel accommodation invoice - {$hostel->name}",
                'transaction_date' => now()->toDateString(),
                'created_by' => $createdBy,
            ]);

            return $invoice->fresh();
        });
    }

    protected function applyAvailableCredits(Invoice $invoice, ?string $createdBy): void
    {
        $allocatedTotal = (float) $invoice->paymentAllocations()->sum('amount');
        $remaining = (float) $invoice->amount_due - $allocatedTotal;
        if ($remaining <= 0) return;

        $creditPayments = Payment::query()
            ->where('student_id', $invoice->student_id)
            ->get()
            ->filter(fn (Payment $p) => $p->unallocated_amount > 0);

        foreach ($creditPayments as $payment) {
            if ($remaining <= 0) break;

            $available = $payment->unallocated_amount;
            $allocationAmount = min($remaining, $available);

            PaymentAllocation::create([
                'payment_id' => $payment->id,
                'invoice_id' => $invoice->id,
                'amount' => $allocationAmount,
                'allocated_at' => now()->toDateString(),
            ]);

            LedgerTransaction::create([
                'student_id' => $invoice->student_id,
                'invoice_id' => $invoice->id,
                'academic_session_id' => $invoice->academic_session_id,
                'type' => 'payment',
                'debit' => 0,
                'credit' => $allocationAmount,
                'reference' => $payment->reference,
                'description' => 'Applied existing credit to invoice.',
                'transaction_date' => now()->toDateString(),
                'created_by' => $createdBy,
            ]);

            $invoice->recalculateTotals();
            $paidTotal = (float) $invoice->paymentAllocations()->sum('amount');
            $remaining = (float) $invoice->amount_due - $paidTotal;
        }
    }
}

