<?php

namespace App\Services;

use App\Models\AcademicSession;
use App\Models\CourseEnrolment;
use App\Models\CourseInvoiceTemplate;
use App\Models\InvoiceAdjustment;
use App\Models\Hostel;
use App\Models\Invoice;
use App\Models\InvoiceComponent;
use App\Models\InvoiceItem;
use App\Models\LedgerTransaction;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BillingService
{
    public function createInvoiceForStudent(Student $student, ?int $createdBy = null, ?AcademicSession $session = null): Invoice
    {
        return DB::transaction(function () use ($student, $createdBy, $session) {
            $courseEnrolment = CourseEnrolment::query()
                ->where('student_id', $student->id)
                ->latest()
                ->first();

            if (!$courseEnrolment) {
                throw ValidationException::withMessages([
                    'enrolment' => 'Student has no course enrolment.',
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

            $courseInvoiceTemplate = CourseInvoiceTemplate::query()
                ->where('course_id', $courseEnrolment->course_id)
                ->where('academic_session_id', $targetSession->id)
                ->with('invoiceTemplate.items')
                ->first();

            if (!$courseInvoiceTemplate?->invoiceTemplate) {
                throw ValidationException::withMessages([
                    'invoice_template' => 'No invoice template assigned to this course.',
                ]);
            }

            $existingInvoice = Invoice::query()
                ->where('student_id', $student->id)
                ->where('academic_session_id', $targetSession->id)
                ->where('invoice_type', 'fees')
                ->whereIn('status', ['issued', 'partial'])
                ->latest()
                ->first();

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
                'paid_amount' => 0,
                'balance_due' => 0,
                'created_by' => $createdBy,
            ]);

            foreach ($courseInvoiceTemplate->invoiceTemplate->items as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'invoice_template_item_id' => $item->id,
                    'description' => $item->name,
                    'unit_amount' => $item->amount,
                    'quantity' => 1,
                    'total_amount' => $item->amount,
                ]);

                InvoiceComponent::create([
                    'invoice_id' => $invoice->id,
                    'invoice_template_item_id' => $item->id,
                    'name' => $item->name,
                    'amount' => $item->amount,
                    'description' => $item->description,
                    'snapshot_data' => [
                        'template_code' => $courseInvoiceTemplate->invoiceTemplate->code,
                        'template_name' => $courseInvoiceTemplate->invoiceTemplate->name,
                        'item_name' => $item->name,
                        'item_amount' => $item->amount,
                        'item_description' => $item->description,
                        'course_id' => $courseEnrolment->course_id,
                        'academic_session_id' => $targetSession->id,
                        'snapshot_taken_at' => now()->toDateTimeString(),
                    ],
                ]);
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

    public function recordPayment(Invoice $invoice, float $amount, string $method, int $createdBy, ?string $reference = null, ?string $paymentDate = null, ?string $notes = null): Payment
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
        }

        return DB::transaction(function () use ($invoice, $amount, $method, $createdBy, $reference, $paymentDate, $notes) {
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

            $remaining = $amount;

            $outstandingInvoices = Invoice::query()
                ->where('student_id', $invoice->student_id)
                ->where('balance_due', '>', 0)
                ->orderBy('issue_date')
                ->orderBy('id')
                ->get();

            foreach ($outstandingInvoices as $inv) {
                if ($remaining <= 0) break;

                $allocationAmount = min($remaining, (float) $inv->balance_due);
                if ($allocationAmount <= 0) continue;

                PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'invoice_id' => $inv->id,
                    'amount' => $allocationAmount,
                    'allocated_at' => now()->toDateString(),
                ]);

                $inv->recalculateTotals();

                LedgerTransaction::create([
                    'student_id' => $inv->student_id,
                    'invoice_id' => $inv->id,
                    'academic_session_id' => $inv->academic_session_id,
                    'type' => 'payment',
                    'debit' => 0,
                    'credit' => $allocationAmount,
                    'reference' => $payment->reference,
                    'description' => 'Payment allocated.',
                    'transaction_date' => now()->toDateString(),
                    'created_by' => $createdBy,
                ]);

                $remaining -= $allocationAmount;
            }

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
                'paid_amount' => 0,
                'balance_due' => 0,
                'notes' => "Hostel Accommodation - {$hostel->name} ({$hostel->code})",
                'idempotency_key' => "student-hostel-booking:{$student->id}:{$hostel->id}",
                'created_by' => $createdBy,
            ]);

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'invoice_template_item_id' => null,
                'description' => "Hostel Accommodation Fee - {$hostel->name}",
                'unit_amount' => (float) $hostel->session_fee_amount,
                'quantity' => 1,
                'total_amount' => (float) $hostel->session_fee_amount,
            ]);

            InvoiceComponent::create([
                'invoice_id' => $invoice->id,
                'invoice_template_item_id' => null,
                'name' => "Hostel Accommodation - {$hostel->name}",
                'amount' => (float) $hostel->session_fee_amount,
                'description' => "Hostel accommodation fee for {$hostel->name} ({$hostel->code})",
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

    protected function applyAvailableCredits(Invoice $invoice, ?int $createdBy): void
    {
        $remaining = (float) $invoice->balance_due;
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
            $remaining = (float) $invoice->balance_due;
        }
    }
}
