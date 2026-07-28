<?php

namespace Tests\Feature;

use App\Models\FeeStructure;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceModuleTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_list_fee_structures(): void
    {
        $this->getJson('/api/fee-structures')->assertOk();
    }

    public function test_list_invoices(): void
    {
        $this->getJson('/api/invoices')->assertOk();
    }

    public function test_view_invoice(): void
    {
        $invoice = Invoice::factory()->create();
        $this->getJson("/api/invoices/{$invoice->id}")->assertOk();
    }

    public function test_list_payments(): void
    {
        $this->getJson('/api/payments')->assertOk();
    }

    public function test_list_ledger(): void
    {
        $this->getJson('/api/ledger')->assertOk();
    }

    public function test_search_student_account(): void
    {
        Student::factory()->create();
        $this->getJson('/api/student-accounts/search?q=test')->assertOk();
    }

    public function test_view_student_account(): void
    {
        $student = Student::factory()->create();
        $this->getJson("/api/student-accounts/{$student->id}")->assertOk();
    }

    public function test_finance_dashboard(): void
    {
        $this->getJson('/api/finance/dashboard')->assertOk();
    }

    public function test_finance_health(): void
    {
        $this->getJson('/api/finance/health')->assertOk();
    }

    public function test_finance_readiness(): void
    {
        $this->getJson('/api/finance/readiness')->assertOk();
    }

    public function test_student_financial_statement(): void
    {
        $student = Student::factory()->create();
        $this->getJson("/api/students/{$student->id}/financial-statement")->assertOk();
    }

    public function test_student_credit_balance(): void
    {
        $student = Student::factory()->create();
        $this->getJson("/api/students/{$student->id}/credit-balance")->assertOk();
    }

    public function test_finance_reports(): void
    {
        $this->getJson('/api/finance/reports?report_type=collections')->assertOk();
    }

    public function test_student_can_view_own_invoices(): void
    {
        Sanctum::actingAs(User::factory()->student()->create());
        $this->getJson('/api/my/invoices')->assertOk();
    }

    public function test_student_can_view_own_finance_summary(): void
    {
        Sanctum::actingAs(User::factory()->student()->create());
        $this->getJson('/api/my/finance-summary')->assertOk();
    }

    public function test_student_can_view_own_ledger(): void
    {
        Sanctum::actingAs(User::factory()->student()->create());
        $this->getJson('/api/my/ledger')->assertOk();
    }
}
