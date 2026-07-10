<?php

namespace App\Console\Commands;

use App\Models\AcademicSession;
use App\Enums\FinanceAuditAction;
use App\Models\FinanceAuditLog;
use App\Models\Student;
use App\Services\InvoiceService;
use Illuminate\Console\Command;

class ReconcileFinance extends Command
{
    protected $signature = 'finance:reconcile {student_id?} {academic_session_id?}';

    protected $description = 'Reconcile finance totals and account balances for students';

    public function handle(): int
    {
        $invoiceService = app(InvoiceService::class);

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
                $invoiceService->reconcileStudentFinance($student, $session);
                FinanceAuditLog::create([
                    'student_id'  => $student->id,
                    'action'      => FinanceAuditAction::RECONCILIATION_RUN,
                    'entity_type' => 'reconciliation',
                    'entity_id'   => "{$student->id}:{$session->id}",
                    'changes'     => ['reconciled_at' => now()->toDateTimeString()],
                ]);
                $count++;
            }
        }

        $this->info("Reconciled {$count} student/session combinations.");

        return 0;
    }
}
