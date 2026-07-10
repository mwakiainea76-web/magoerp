<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\StudentLedgerEntry;
use App\Models\User;
use App\Services\PaymentService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceReportsTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_debtor_aging_collection_and_csv_reports_are_available(): void
    {
        $invoice = Invoice::factory()->create([
            'amount_due' => 500,
            'computed_amount' => 500,
            'due_date' => now()->subDays(35),
        ]);

        $this->getJson('/api/finance/reports?report_type=debtors')
            ->assertOk()
            ->assertJsonPath('data.0.student_id', $invoice->student_id)
            ->assertJsonPath('data.0.balance', 500);

        $this->getJson('/api/finance/reports?report_type=aging')
            ->assertOk()
            ->assertJsonPath('data.0.aging_bucket', '31-60 days')
            ->assertJsonPath('data.0.balance', 500);

        $this->getJson('/api/finance/reports?report_type=collections')
            ->assertOk()
            ->assertJsonPath('data.0.invoiced', 500)
            ->assertJsonPath('data.0.outstanding', 500);

        $this->get('/api/finance/reports/export?report_type=debtors')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_dashboard_uses_signed_balance_after_unallocated_credit(): void
    {
        AcademicSession::factory()->active()->create();
        $student = Student::factory()->create();
        Invoice::factory()->create([
            'student_id' => $student->id,
            'amount_due' => 500,
            'computed_amount' => 500,
            'issue_date' => now(),
        ]);

        app(PaymentService::class)->recordStudentPayment(
            $student,
            11000,
            'cash',
            $this->admin->id,
            'REPORT-CREDIT-11000',
        );

        $this->getJson('/api/finance/dashboard')
            ->assertOk()
            ->assertJsonPath('data.summary.outstanding_balance', -10500);
    }

    public function test_credit_report_returns_negative_ledger_balances_as_available_credit(): void
    {
        $session = AcademicSession::factory()->create();
        $student = Student::factory()->create();
        StudentLedgerEntry::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $session->id,
            'type' => 'payment',
            'debit' => 0,
            'credit' => 700,
        ]);

        $this->getJson('/api/finance/reports?report_type=credits')
            ->assertOk()
            ->assertJsonPath('data.0.student_id', $student->id)
            ->assertJsonPath('data.0.credit', 700)
            ->assertJsonPath('data.0.signed_balance', -700);
    }

    public function test_invalid_or_incomplete_statement_scope_is_rejected(): void
    {
        $student = Student::factory()->create();

        $this->getJson("/api/students/{$student->id}/financial-statement?scope=per_session")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('academic_session_id');
    }
}
