<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Payment;
use App\Models\Student;
use App\Models\StudentLedgerEntry;
use App\Services\PaymentService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentFeeStatementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_standalone_payment_is_posted_as_ledger_credit(): void
    {
        $session = AcademicSession::factory()->active()->create();
        $student = Student::factory()->create();

        $payment = app(PaymentService::class)->recordStudentPayment(
            $student,
            6000,
            'Bank Transfer',
            null,
            'STANDALONE-001',
            '2026-07-02',
        );

        $entry = StudentLedgerEntry::where('payment_id', $payment->id)->firstOrFail();

        $this->assertSame($session->id, $entry->academic_session_id);
        $this->assertSame(6000.0, (float) $entry->credit);
        $this->assertSame(0.0, (float) $entry->debit);
    }

    public function test_student_statement_uses_authenticated_student_and_includes_legacy_unposted_payment(): void
    {
        $student = Student::factory()->create(['admission_number' => 'STU/001/26']);
        Payment::create([
            'student_id' => $student->id,
            'amount' => 6000,
            'payment_date' => '2026-07-02',
            'method' => 'Bank Transfer',
            'reference' => '12345',
            'status' => 'completed',
            'idempotency_key' => 'legacy-payment-12345',
        ]);

        Sanctum::actingAs($student->user);

        $this->getJson('/api/my/financial-statement')
            ->assertOk()
            ->assertJsonPath('data.student.admission_number', 'STU/001/26')
            ->assertJsonPath('data.transactions.0.reference', '12345')
            ->assertJsonPath('data.transactions.0.credit', 6000)
            ->assertJsonPath('data.summary.total_credit', 6000)
            ->assertJsonPath('data.summary.ledger_balance', -6000);

        $this->get('/api/my/financial-statement/download?scope=session_to_date')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}
