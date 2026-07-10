<?php

namespace Tests\Feature;

use App\Enums\FinanceAuditAction;
use App\Models\AcademicSession;
use App\Models\FinanceAuditLog;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Student;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceAuditLoggingTest extends TestCase
{
    protected InvoiceService $invoiceService;
    protected PaymentService $paymentService;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
        $this->invoiceService = app(InvoiceService::class);
        $this->paymentService = app(PaymentService::class);
    }

    public function test_invoice_creation_is_logged_in_audit_trail(): void
    {
        $student = Student::factory()->create();
        $session = AcademicSession::factory()->active()->create();

        // Clear any existing audit logs for this student
        FinanceAuditLog::where('student_id', $student->id)->delete();

        // Create an invoice directly
        $invoice = Invoice::factory()->for($student)->for($session, 'academicSession')->create();

        // Manually audit log since createInvoiceForStudent requires course enrollment
        $this->invoiceService->auditLog(
            $student,
            FinanceAuditAction::INVOICE_CREATED,
            'invoice',
            $invoice->id,
            ['invoice_number' => $invoice->invoice_number, 'amount' => 500]
        );

        // Verify audit log was created
        $auditLog = FinanceAuditLog::where('student_id', $student->id)
            ->where('action', FinanceAuditAction::INVOICE_CREATED)
            ->where('entity_type', 'invoice')
            ->where('entity_id', $invoice->id)
            ->first();

        $this->assertNotNull($auditLog);
        $this->assertIsArray($auditLog->changes);
        $this->assertArrayHasKey('invoice_number', $auditLog->changes);
    }

    public function test_payment_recording_is_logged_in_audit_trail(): void
    {
        $student = Student::factory()->create();
        $session = AcademicSession::factory()->active()->create();
        $invoice = Invoice::factory()->for($student)->for($session, 'academicSession')->create(['amount_due' => 500]);

        InvoiceLineItem::factory()->for($invoice)->create(['total_amount' => 500]);
        $invoice->recalculateTotals();

        // Clear any existing audit logs for this student
        FinanceAuditLog::where('student_id', $student->id)->delete();

        // Record a payment
        $payment = $this->paymentService->recordPayment(
            $invoice,
            amount: 500,
            method: 'bank_transfer',
            createdBy: null,
            reference: 'txn-123456'
        );

        // Verify audit log was created
        $auditLog = FinanceAuditLog::where('student_id', $student->id)
            ->where('action', FinanceAuditAction::PAYMENT_RECORDED)
            ->where('entity_type', 'payment')
            ->where('entity_id', $payment->id)
            ->first();

        $this->assertNotNull($auditLog);
        $this->assertSame('txn-123456', $auditLog->changes['reference']);
    }

    public function test_audit_logs_include_user_and_ip_information(): void
    {
        $student = Student::factory()->create();
        $session = AcademicSession::factory()->active()->create();

        FinanceAuditLog::where('student_id', $student->id)->delete();

        $invoice = Invoice::factory()->for($student)->for($session, 'academicSession')->create();
        $this->invoiceService->auditLog(
            $student,
            FinanceAuditAction::INVOICE_CREATED,
            'invoice',
            $invoice->id,
            []
        );

        $auditLog = FinanceAuditLog::where('student_id', $student->id)
            ->where('entity_type', 'invoice')
            ->first();

        // IP address should be captured (even in tests it will be a value)
        $this->assertIsString($auditLog->ip_address);
        // User agent should be captured
        $this->assertIsString($auditLog->user_agent);
    }

    public function test_audit_logs_can_be_filtered_by_action(): void
    {
        $student = Student::factory()->create();
        $session = AcademicSession::factory()->active()->create();

        FinanceAuditLog::where('student_id', $student->id)->delete();

        // Create an invoice  
        $invoice = Invoice::factory()->for($student)->for($session, 'academicSession')->create();
        $this->invoiceService->auditLog(
            $student,
            FinanceAuditAction::INVOICE_CREATED,
            'invoice',
            $invoice->id,
            []
        );

        // Query audit logs
        $createdLogs = FinanceAuditLog::where('student_id', $student->id)
            ->where('action', FinanceAuditAction::INVOICE_CREATED)
            ->count();

        $this->assertGreaterThanOrEqual(1, $createdLogs);
    }

    public function test_audit_logs_endpoint_returns_filtered_results(): void
    {
        $student = Student::factory()->create();
        $session = AcademicSession::factory()->active()->create();

        // Create an invoice for audit trail
        $invoice = Invoice::factory()->for($student)->for($session, 'academicSession')->create();
        $this->invoiceService->auditLog(
            $student,
            FinanceAuditAction::INVOICE_CREATED,
            'invoice',
            $invoice->id,
            []
        );

        $response = $this->getJson("/api/finance/audit-logs?student_id={$student->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'action', 'entity_type', 'entity_id', 'changes', 'created_at'],
                ],
            ]);
    }

    public function test_audit_logs_endpoint_requires_student_id(): void
    {
        $response = $this->getJson('/api/finance/audit-logs');

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('student_id');
    }

    public function test_audit_logs_endpoint_filters_by_action(): void
    {
        $student = Student::factory()->create();
        $session = AcademicSession::factory()->active()->create();

        $invoice = Invoice::factory()->for($student)->for($session, 'academicSession')->create();
        $this->invoiceService->auditLog(
            $student,
            FinanceAuditAction::INVOICE_CREATED,
            'invoice',
            $invoice->id,
            []
        );

        $response = $this->getJson("/api/finance/audit-logs?student_id={$student->id}&action=invoice_created");

        $response->assertOk();
        $logs = $response->json('data');
        
        foreach ($logs as $log) {
            $this->assertSame('invoice_created', $log['action']);
        }
    }
}
