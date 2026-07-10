<?php

namespace App\Services;

use App\Enums\FinanceAuditAction;
use App\Enums\StudentStatus;
use App\Models\AcademicSession;
use App\Models\Invoice;
use App\Models\InvoicePaymentAllocation;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Student;
use App\Models\StudentAccountBalance;
use App\Models\StudentLedgerEntry;
use App\Services\Traits\FinanceHelpers;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    use FinanceHelpers;

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

            $student = Student::query()->lockForUpdate()->findOrFail($invoice->student_id);
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            if ($invoice->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'invoice' => 'Cannot record a payment against a cancelled invoice.',
                ]);
            }

            $idempotencyKey = $reference
                ? "pay:{$invoice->student_id}:{$reference}"
                : null;

            if ($idempotencyKey) {
                $existing = Payment::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing;
                }
            }

            $paymentSession = $this->currentActiveSession() ?? $invoice->academicSession;

            if (!$paymentSession) {
                throw ValidationException::withMessages([
                    'session' => 'No active academic session found.',
                ]);
            }

            $payment = Payment::create([
                'student_id'      => $invoice->student_id,
                'academic_session_id' => $paymentSession->id,
                'amount'          => $amount,
                'payment_date'    => $paymentDate ?? now()->toDateString(),
                'method'          => $method,
                'reference'       => $reference,
                'status'          => 'completed',
                'idempotency_key' => $idempotencyKey,
                'created_by'      => $createdBy,
                'notes'           => $notes,
            ]);

            $allocationAmount = $this->calculateOutstanding($invoice);
            $allocationAmount = min($amount, $allocationAmount);

            if ($allocationAmount > 0) {
                InvoicePaymentAllocation::create([
                    'payment_id'   => $payment->id,
                    'invoice_id'   => $invoice->id,
                    'academic_session_id' => $invoice->academic_session_id,
                    'amount'       => $allocationAmount,
                    'allocated_at' => $paymentDate ?? now()->toDateString(),
                ]);

                $invoice->recalculateTotals();

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

                $this->syncAccountBalance($invoice->student_id, $invoice->academic_session_id);
            }

            $this->auditLog(
                $student,
                FinanceAuditAction::PAYMENT_RECORDED,
                'payment',
                $payment->id,
                [
                    'amount' => $amount,
                    'method' => $method,
                    'reference' => $reference,
                    'invoice_id' => $invoice->id,
                ]
            );

            return $payment;
        });
    }

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

            $student = Student::query()->lockForUpdate()->findOrFail($student->id);

            $idempotencyKey = $reference
                ? "pay:{$student->id}:{$reference}"
                : null;

            if ($idempotencyKey) {
                $existing = Payment::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing;
                }
            }

            $paymentSession = $this->currentActiveSession();

            if (!$paymentSession) {
                throw ValidationException::withMessages([
                    'session' => 'No active academic session found.',
                ]);
            }

            $payment = Payment::create([
                'student_id'      => $student->id,
                'academic_session_id' => $paymentSession->id,
                'amount'          => $amount,
                'payment_date'    => $paymentDate ?? now()->toDateString(),
                'method'          => $method,
                'reference'       => $reference,
                'status'          => 'completed',
                'idempotency_key' => $idempotencyKey,
                'created_by'      => $createdBy,
                'notes'           => $notes,
            ]);

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
                    $invoice->recalculateTotals();
                    continue;
                }

                $allocationAmount = min($remaining, $outstanding);

                InvoicePaymentAllocation::create([
                    'payment_id'   => $payment->id,
                    'invoice_id'   => $invoice->id,
                    'academic_session_id' => $invoice->academic_session_id,
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

                if ($invoice->academic_session_id) {
                    $sessionsSynced[$invoice->academic_session_id] = true;
                }
            }

            if ($remaining > 0) {
                $activeSessionId = $paymentSession->id;

                StudentLedgerEntry::create([
                    'student_id' => $student->id,
                    'payment_id' => $payment->id,
                    'academic_session_id' => $activeSessionId,
                    'type' => 'payment',
                    'debit' => 0,
                    'credit' => $remaining,
                    'reference' => $reference,
                    'description' => 'Payment received as unallocated credit.',
                    'transaction_date' => $paymentDate ?? now()->toDateString(),
                    'created_by' => $createdBy,
                ]);

                if ($activeSessionId) {
                    $sessionsSynced[$activeSessionId] = true;
                }
            }

            if (empty($sessionsSynced)) {
                $activeSession = $paymentSession->id;

                if ($activeSession) {
                    $this->syncAccountBalance($student->id, $activeSession);
                }
            } else {
                foreach (array_keys($sessionsSynced) as $sessionId) {
                    $this->syncAccountBalance($student->id, $sessionId);
                }
            }

            $this->auditLog(
                $student,
                FinanceAuditAction::PAYMENT_RECORDED,
                'payment',
                $payment->id,
                [
                    'amount' => $amount,
                    'method' => $method,
                    'reference' => $reference,
                ]
            );

            return $payment;
        });
    }

    public function reversePayment(Payment $payment, string $reason, string $reversedBy): Payment
    {
        if ($payment->status !== 'completed') {
            throw ValidationException::withMessages([
                'payment' => 'Only completed payments can be reversed.',
            ]);
        }

        return DB::transaction(function () use ($payment, $reason, $reversedBy) {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $studentId = $payment->student_id;
            $sessionsSynced = [];

            $allocations = InvoicePaymentAllocation::where('payment_id', $payment->id)
                ->lockForUpdate()
                ->get();
            foreach ($allocations as $allocation) {
                $invoice = Invoice::lockForUpdate()->find($allocation->invoice_id);
                if (!$invoice) continue;

                StudentLedgerEntry::create([
                    'student_id'          => $studentId,
                    'invoice_id'          => $invoice->id,
                    'payment_id'          => $payment->id,
                    'academic_session_id' => $invoice->academic_session_id,
                    'type'                => 'payment_reversal',
                    'debit'               => (float) $allocation->amount,
                    'credit'              => 0,
                    'reference'           => $payment->reference,
                    'description'         => 'Payment reversal - ' . $reason,
                    'transaction_date'    => now()->toDateString(),
                    'created_by'          => $reversedBy,
                ]);

                $allocation->delete();
                $invoice->recalculateTotals();

                if ($invoice->academic_session_id) {
                    $sessionsSynced[$invoice->academic_session_id] = true;
                }
            }

            $unallocatedEntries = StudentLedgerEntry::where('payment_id', $payment->id)
                ->whereNull('invoice_id')
                ->where('type', 'payment')
                ->where('credit', '>', 0)
                ->get();

            foreach ($unallocatedEntries as $entry) {
                StudentLedgerEntry::create([
                    'student_id'          => $studentId,
                    'payment_id'          => $payment->id,
                    'academic_session_id' => $entry->academic_session_id,
                    'type'                => 'payment_reversal',
                    'debit'               => (float) $entry->credit,
                    'credit'              => 0,
                    'reference'           => $payment->reference,
                    'description'         => 'Reversal of unallocated credit - ' . $reason,
                    'transaction_date'    => now()->toDateString(),
                    'created_by'          => $reversedBy,
                ]);

                if ($entry->academic_session_id) {
                    $sessionsSynced[$entry->academic_session_id] = true;
                }
            }

            $payment->update([
                'status'          => 'reversed',
                'reversed_at'     => now(),
                'reversed_by'     => $reversedBy,
                'reversal_reason' => $reason,
            ]);

            foreach (array_keys($sessionsSynced) as $sessionId) {
                $this->syncAccountBalance($studentId, $sessionId);
            }

            $student = Student::find($studentId);
            if ($student) {
                $this->auditLog(
                    $student,
                    FinanceAuditAction::PAYMENT_REVERSED,
                    'payment',
                    $payment->id,
                    [
                        'amount'          => (float) $payment->amount,
                        'reason'          => $reason,
                        'reversed_by'     => $reversedBy,
                        'allocations'     => $allocations->count(),
                        'unallocated'     => $unallocatedEntries->count(),
                    ]
                );
            }

            return $payment->fresh();
        });
    }

    public function processRefund(
        Student $student,
        float $amount,
        ?string $reason = null,
        ?string $processedBy = null,
        ?Invoice $invoice = null
    ): Refund {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Refund amount must be greater than zero.',
            ]);
        }

        return DB::transaction(function () use ($student, $amount, $reason, $processedBy, $invoice) {
            $student = Student::query()->lockForUpdate()->findOrFail($student->id);

            if ($student->status !== StudentStatus::Graduated) {
                throw ValidationException::withMessages([
                    'student' => 'Refunds can only be issued to graduated students.',
                ]);
            }

            if ($invoice) {
                $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

                if ($invoice->student_id !== $student->id) {
                    throw ValidationException::withMessages([
                        'invoice_id' => 'The selected invoice does not belong to this student.',
                    ]);
                }

                if ($invoice->status === 'cancelled') {
                    throw ValidationException::withMessages([
                        'invoice_id' => 'A refund cannot be linked to a cancelled invoice.',
                    ]);
                }
            }

            $targetSession = $invoice?->academicSession ?? $this->currentActiveSession();

            if (!$targetSession) {
                throw ValidationException::withMessages([
                    'session' => 'No active academic session found.',
                ]);
            }

            $this->syncAccountBalance($student->id, $targetSession->id);
            $balance = StudentAccountBalance::query()
                ->where('student_id', $student->id)
                ->where('academic_session_id', $targetSession->id)
                ->lockForUpdate()
                ->value('balance');

            $availableCredit = max(0, (float) ($balance !== null ? -$balance : 0));

            if ($availableCredit <= 0) {
                throw ValidationException::withMessages([
                    'amount' => 'This student has no credit balance to refund.',
                ]);
            }

            if ($amount > $availableCredit) {
                throw ValidationException::withMessages([
                    'amount' => 'Refund amount cannot exceed the available credit balance.',
                ]);
            }

            $idempotencyKey = "refund:{$student->id}:{$amount}:{$invoice?->id}";

            $existingRefund = Refund::where('idempotency_key', $idempotencyKey)->first();
            if ($existingRefund) {
                return $existingRefund;
            }

            $refund = Refund::create([
                'student_id'    => $student->id,
                'invoice_id'    => $invoice?->id,
                'academic_session_id' => $targetSession->id,
                'amount'        => $amount,
                'reason'        => $reason,
                'status'        => 'processed',
                'processed_by'  => $processedBy,
                'processed_at'  => now(),
                'idempotency_key' => $idempotencyKey,
            ]);

            StudentLedgerEntry::create([
                'student_id'          => $student->id,
                'invoice_id'          => $invoice?->id,
                'refund_id'           => $refund->id,
                'academic_session_id' => $targetSession->id,
                'type'                => 'refund',
                'debit'               => $amount,
                'credit'              => 0,
                'reference'           => $refund->id,
                'description'         => $reason ?? 'Refund of excess credit.',
                'transaction_date'    => now()->toDateString(),
                'created_by'          => $processedBy,
            ]);

            $this->syncAccountBalance($student->id, $targetSession->id);
            return $refund;
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
}
