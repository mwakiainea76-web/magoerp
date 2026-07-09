<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\StudentAccountBalance;
use App\Models\StudentLedgerEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentAccountController extends Controller
{
    /**
     * Search for a student by name/admission_number.
     */
    public function searchStudent(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $search = trim((string) $request->string('q', ''));
        if (strlen($search) < 2) {
            return response()->json(['data' => []]);
        }

        $like = '%' . $search . '%';
        $students = Student::query()
            ->with(['user:id,first_name,middle_name,last_name', 'activeEnrolment.courseCurriculum.course'])
            ->where(function ($q) use ($like) {
                $q->where('admission_number', 'like', $like)
                  ->orWhereHas('user', fn($u) => $u->where('first_name', 'like', $like)
                      ->orWhere('middle_name', 'like', $like)
                      ->orWhere('last_name', 'like', $like));
            })
            ->limit(20)
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'admission_number' => $s->admission_number,
                'name' => trim("{$s->user?->first_name} {$s->user?->middle_name} {$s->user?->last_name}"),
                'course' => $s->activeEnrolment?->courseCurriculum?->course?->name,
                'status' => $s->status,
            ]);

        return response()->json(['data' => $students]);
    }

    /**
     * Get account overview for a student.
     */
    public function overview(Request $request, Student $student): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $student->load(['user:id,first_name,middle_name,last_name', 'activeEnrolment.courseCurriculum.course']);

        $activeSession = \App\Models\AcademicSession::where('is_active', true)->latest('start_date')->first();

        // Get balances
        $overallBalance = StudentAccountBalance::where('student_id', $student->id)->sum('balance');
        $sessionBalance = $activeSession
            ? StudentAccountBalance::where('student_id', $student->id)
                ->where('academic_session_id', $activeSession->id)
                ->value('balance')
            : 0;
        $creditBalance = abs(min($overallBalance, 0));

        // Recent transactions (last 20)
        $recentTransactions = StudentLedgerEntry::where('student_id', $student->id)
            ->with(['invoice:id,invoice_number', 'payment:id,method,reference'])
            ->latest('transaction_date')
            ->limit(20)
            ->get()
            ->map(fn($e) => [
                'id' => $e->id,
                'type' => $e->type,
                'debit' => (float) $e->debit,
                'credit' => (float) $e->credit,
                'description' => $e->description,
                'reference' => $e->reference ?? $e->invoice?->invoice_number ?? $e->payment?->reference,
                'transaction_date' => $e->transaction_date,
            ]);

        // Outstanding invoices
        $invoices = Invoice::where('student_id', $student->id)
            ->whereIn('status', ['issued', 'partial'])
            ->withCount('items')
            ->latest('issue_date')
            ->limit(10)
            ->get()
            ->map(fn($inv) => [
                'id' => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'status' => $inv->status,
                'amount_due' => (float) $inv->amount_due,
                'issue_date' => $inv->issue_date,
                'due_date' => $inv->due_date,
                'items_count' => $inv->items_count,
            ]);

        // Recent payments
        $payments = Payment::where('student_id', $student->id)
            ->latest('payment_date')
            ->limit(10)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'method' => $p->method,
                'reference' => $p->reference,
                'payment_date' => $p->payment_date,
                'status' => $p->status,
            ]);

        $studentInfo = [
            'id' => $student->id,
            'admission_number' => $student->admission_number,
            'name' => trim("{$student->user?->first_name} {$student->user?->middle_name} {$student->user?->last_name}"),
            'course' => $student->activeEnrolment?->courseCurriculum?->course?->name,
            'status' => $student->status,
        ];

        return response()->json([
            'data' => [
                'student' => $studentInfo,
                'overall_balance' => round($overallBalance, 2),
                'session_balance' => round($sessionBalance, 2),
                'credit_balance' => round($creditBalance, 2),
                'recent_transactions' => $recentTransactions,
                'invoices' => $invoices,
                'payments' => $payments,
            ],
        ]);
    }
}
