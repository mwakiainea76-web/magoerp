<?php

namespace App\Console\Commands;

use App\Models\AcademicSession;
use App\Models\Student;
use App\Services\BillingService;
use Illuminate\Console\Command;

class ReconcileFinance extends Command
{
    protected $signature = 'finance:reconcile {student_id?} {academic_session_id?}';

    protected $description = 'Reconcile finance totals and account balances for students';

    public function handle(): int
    {
        $billingService = app(BillingService::class);

        $studentId = $this->argument('student_id');
        $sessionId = $this->argument('academic_session_id');

        $students = $studentId
            ? Student::query()->whereKey($studentId)->get()
            : Student::query()->get();

        $sessions = $sessionId
            ? AcademicSession::query()->whereKey($sessionId)->get()
            : AcademicSession::query()->get();

        $count = 0;
        foreach ($students as $student) {
            foreach ($sessions as $session) {
                $billingService->reconcileStudentFinance($student, $session);
                $count++;
            }
        }

        $this->info("Reconciled {$count} student/session combinations.");

        return 0;
    }
}
