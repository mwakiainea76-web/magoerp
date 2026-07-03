<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\StudentLedgerEntry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceDataExportsController extends Controller
{
    public function invoices(Request $request): StreamedResponse
    {
        $this->authorizeFinance($request);
        $query = Invoice::query()
            ->with(['student.user', 'academicSession', 'paymentAllocations', 'adjustments'])
            ->when($request->string('status', 'all')->toString() !== 'all', fn (Builder $q) => $q->where('status', $request->string('status')))
            ->when($request->filled('admission_number'), fn (Builder $q) => $q->whereHas('student', fn (Builder $student) => $student->where('admission_number', 'like', '%' . $request->string('admission_number') . '%')))
            ->when($request->filled('department_id'), fn (Builder $q) => $q->where('department_id', $request->string('department_id')))
            ->when($request->filled('course_id'), fn (Builder $q) => $q->where('course_id', $request->string('course_id')))
            ->when($request->filled('academic_session_id'), fn (Builder $q) => $q->where('academic_session_id', $request->string('academic_session_id')))
            ->when($request->filled('academic_year_id') && ! $request->filled('academic_session_id'), fn (Builder $q) => $q->whereHas('academicSession', fn (Builder $session) => $session->where('academic_year_id', $request->string('academic_year_id'))))
            ->when($request->filled('date_from'), fn (Builder $q) => $q->whereDate('issue_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn (Builder $q) => $q->whereDate('issue_date', '<=', $request->date('date_to')))
            ->orderByDesc('issue_date');

        return $this->csv('invoices', [
            'Invoice', 'Student', 'Admission No.', 'Session', 'Type', 'Issue Date', 'Due Date',
            'Amount', 'Paid', 'Adjustments', 'Balance', 'Status',
        ], $query->cursor()->map(function (Invoice $invoice) {
            $paid = (float) $invoice->paymentAllocations->sum('amount');
            $credits = (float) $invoice->adjustments->whereIn('type', ['discount', 'waiver', 'bursary', 'helb', 'reversal'])->sum('amount');
            $debits = (float) $invoice->adjustments->whereNotIn('type', ['discount', 'waiver', 'bursary', 'helb', 'reversal'])->sum('amount');
            return [
                $invoice->invoice_number,
                $invoice->student?->full_name,
                $invoice->student?->admission_number,
                $invoice->academicSession?->name,
                $invoice->invoice_type,
                $invoice->issue_date?->format('Y-m-d'),
                $invoice->due_date?->format('Y-m-d'),
                (float) $invoice->amount_due,
                $paid,
                $credits - $debits,
                (float) $invoice->amount_due - $paid - $credits + $debits,
                $invoice->status,
            ];
        }));
    }

    public function payments(Request $request): StreamedResponse
    {
        $this->authorizeFinance($request);
        $query = Payment::query()
            ->with(['student.user', 'allocations.invoice'])
            ->when($request->string('status', 'all')->toString() !== 'all', fn (Builder $q) => $q->where('status', $request->string('status')))
            ->when($request->filled('admission_number'), fn (Builder $q) => $q->whereHas('student', fn (Builder $student) => $student->where('admission_number', 'like', '%' . $request->string('admission_number') . '%')))
            ->when($request->filled('department_id'), fn (Builder $q) => $q->whereHas('allocations.invoice', fn (Builder $invoice) => $invoice->where('department_id', $request->string('department_id'))))
            ->when($request->filled('course_id'), fn (Builder $q) => $q->whereHas('allocations.invoice', fn (Builder $invoice) => $invoice->where('course_id', $request->string('course_id'))))
            ->when($request->filled('academic_session_id'), fn (Builder $q) => $q->whereHas('allocations.invoice', fn (Builder $invoice) => $invoice->where('academic_session_id', $request->string('academic_session_id'))))
            ->when($request->filled('academic_year_id') && ! $request->filled('academic_session_id'), fn (Builder $q) => $q->whereHas('allocations.invoice.academicSession', fn (Builder $session) => $session->where('academic_year_id', $request->string('academic_year_id'))))
            ->when($request->filled('date_from'), fn (Builder $q) => $q->whereDate('payment_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn (Builder $q) => $q->whereDate('payment_date', '<=', $request->date('date_to')))
            ->orderByDesc('payment_date');

        return $this->csv('payments', [
            'Date', 'Student', 'Admission No.', 'Reference', 'Method', 'Amount', 'Allocated', 'Unallocated', 'Status',
        ], $query->cursor()->map(function (Payment $payment) {
            $allocated = (float) $payment->allocations->sum('amount');
            return [
                $payment->payment_date?->format('Y-m-d'),
                $payment->student?->full_name,
                $payment->student?->admission_number,
                $payment->reference,
                $payment->method,
                (float) $payment->amount,
                $allocated,
                (float) $payment->amount - $allocated,
                $payment->status,
            ];
        }));
    }

    public function ledger(Request $request): StreamedResponse
    {
        $this->authorizeFinance($request);
        $query = StudentLedgerEntry::query()
            ->with(['student.user', 'invoice', 'academicSession', 'payment'])
            ->when($request->filled('student_id'), fn (Builder $q) => $q->where('student_id', $request->string('student_id')))
            ->when($request->filled('academic_session_id'), fn (Builder $q) => $q->where('academic_session_id', $request->string('academic_session_id')))
            ->when($request->filled('date_from'), fn (Builder $q) => $q->whereDate('transaction_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn (Builder $q) => $q->whereDate('transaction_date', '<=', $request->date('date_to')))
            ->orderBy('transaction_date')
            ->orderBy('created_at');

        return $this->csv('ledger', [
            'Date', 'Student', 'Admission No.', 'Session', 'Type', 'Invoice', 'Payment Ref.', 'Description', 'Debit', 'Credit', 'Net',
        ], $query->cursor()->map(fn (StudentLedgerEntry $entry) => [
            $entry->transaction_date?->format('Y-m-d'),
            $entry->student?->full_name,
            $entry->student?->admission_number,
            $entry->academicSession?->name,
            $entry->type,
            $entry->invoice?->invoice_number,
            $entry->payment?->reference,
            $entry->description,
            (float) $entry->debit,
            (float) $entry->credit,
            (float) $entry->debit - (float) $entry->credit,
        ]));
    }

    public function dashboard(Request $request): StreamedResponse
    {
        $this->authorizeFinance($request);
        $response = app(FinanceReportsDashboardController::class)($request);
        $payload = $response->getData(true);
        $summary = $payload['data']['summary'];
        $rows = collect([
            ['Total invoiced', $summary['total_invoiced']],
            ['Total collected', $summary['total_collected']],
            ['Outstanding balance', $summary['outstanding_balance']],
            ['Net adjustments', $summary['total_adjustments']],
            ['Total refunds', $summary['total_refunds']],
            ['Collection rate %', $summary['collection_rate']],
        ]);

        return $this->csv('finance-dashboard', ['Metric', 'Value'], $rows);
    }

    private function authorizeFinance(Request $request): void
    {
        abort_unless($request->user()?->can('finance.view'), 403);
    }

    private function csv(string $prefix, array $headers, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $output = fopen('php://output', 'wb');
            fputcsv($output, $headers);
            foreach ($rows as $row) fputcsv($output, $row);
            fclose($output);
        }, $prefix . '-' . now()->format('Ymd-His') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
