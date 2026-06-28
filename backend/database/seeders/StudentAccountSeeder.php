<?php

namespace Database\Seeders;

use App\Models\AcademicSessionEnrolment;
use App\Models\StudentLedgerEntry;
use App\Models\StudentAccountBalance;
use Illuminate\Database\Seeder;

class StudentAccountSeeder extends Seeder
{
    public function run(): void
    {
        $enrolments = AcademicSessionEnrolment::with('student')->get();

        foreach ($enrolments as $enrolment) {
            $studentId = $enrolment->student_id;
            $sessionId = $enrolment->academic_session_id;

            $totalInvoiced = (float) StudentLedgerEntry::where('student_id', $studentId)
                ->where('academic_session_id', $sessionId)
                ->where('type', 'debit')
                ->sum('debit');

            $totalPaid = (float) StudentLedgerEntry::where('student_id', $studentId)
                ->where('academic_session_id', $sessionId)
                ->where('type', 'payment')
                ->sum('credit');

            $latestTransaction = StudentLedgerEntry::where('student_id', $studentId)
                ->where('academic_session_id', $sessionId)
                ->latest('transaction_date')
                ->first();

            StudentAccountBalance::updateOrCreate(
                [
                    'student_id' => $studentId,
                    'academic_session_id' => $sessionId,
                ],
                [
                    'total_invoiced' => $totalInvoiced,
                    'total_paid' => $totalPaid,
                    'balance' => $totalInvoiced - $totalPaid,
                    'last_transaction_at' => $latestTransaction?->transaction_date,
                ]
            );
        }
    }
}
