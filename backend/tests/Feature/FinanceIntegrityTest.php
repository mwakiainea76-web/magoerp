<?php

namespace Tests\Feature;

use App\Enums\StudentStatus;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\CourseCurriculum;
use App\Models\CourseEnrolment;
use App\Models\CurriculumFeeAssignment;
use App\Models\FeeTemplate;
use App\Models\FeeTemplateItem;
use App\Models\Invoice;
use App\Models\InvoicePaymentAllocation;
use App\Models\InvoiceLineItem;
use App\Models\Payment;
use App\Models\Student;
use App\Models\StudentLedgerEntry;
use App\Models\User;
use App\Services\BillingService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceIntegrityTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_invoice_detail_loads_the_existing_ledger_relation(): void
    {
        $invoice = Invoice::factory()->create();

        $this->getJson("/api/invoices/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $invoice->id);
    }

    public function test_graduated_student_status_enum_allows_a_refund(): void
    {
        AcademicSession::factory()->active()->create();
        $student = Student::factory()->create(['status' => StudentStatus::Graduated]);

        app(BillingService::class)->recordStudentPayment(
            $student,
            500,
            'cash',
            $this->admin->id,
            'REFUND-CREDIT-001',
        );

        $this->postJson('/api/refunds', [
            'student_id' => $student->id,
            'amount' => 200,
            'reason' => 'Excess payment',
        ])->assertCreated()
            ->assertJsonPath('data.amount', 200);
    }

    public function test_refund_rejects_an_invoice_owned_by_another_student(): void
    {
        $session = AcademicSession::factory()->active()->create();
        $student = Student::factory()->create(['status' => StudentStatus::Graduated]);
        $otherStudent = Student::factory()->create();
        $invoice = Invoice::factory()->for($otherStudent)->for($session, 'academicSession')->create();

        app(BillingService::class)->recordStudentPayment(
            $student,
            500,
            'cash',
            $this->admin->id,
            'REFUND-CREDIT-002',
        );

        $this->postJson('/api/refunds', [
            'student_id' => $student->id,
            'invoice_id' => $invoice->id,
            'amount' => 100,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('invoice_id');
    }

    public function test_reconcile_student_finance_recomputes_invoice_totals_from_line_items(): void
    {
        $session = AcademicSession::factory()->active()->create();
        $student = Student::factory()->create();
        $invoice = Invoice::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $session->id,
            'amount_due' => 999,
            'computed_amount' => 999,
        ]);

        InvoiceLineItem::factory()->create([
            'invoice_id' => $invoice->id,
            'name' => 'Tuition',
            'amount' => 500,
            'quantity' => 1,
            'total_amount' => 500,
        ]);
        InvoiceLineItem::factory()->create([
            'invoice_id' => $invoice->id,
            'name' => 'Library',
            'amount' => 300,
            'quantity' => 1,
            'total_amount' => 300,
        ]);

        $invoice->forceFill([
            'amount_due' => 999,
            'computed_amount' => 999,
            'status' => 'issued',
        ])->save();

        app(BillingService::class)->reconcileStudentFinance($student, $session);

        $invoice->refresh();

        $this->assertSame(800.0, (float) $invoice->amount_due);
        $this->assertSame(800.0, (float) $invoice->computed_amount);
    }

    public function test_finance_reconciliation_endpoint_recomputes_balances_for_a_student(): void
    {
        $session = AcademicSession::factory()->active()->create();
        $student = Student::factory()->create();
        $invoice = Invoice::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $session->id,
            'amount_due' => 999,
            'computed_amount' => 999,
        ]);

        InvoiceLineItem::factory()->create([
            'invoice_id' => $invoice->id,
            'name' => 'Tuition',
            'amount' => 500,
            'quantity' => 1,
            'total_amount' => 500,
        ]);
        InvoiceLineItem::factory()->create([
            'invoice_id' => $invoice->id,
            'name' => 'Library',
            'amount' => 300,
            'quantity' => 1,
            'total_amount' => 300,
        ]);

        $this->postJson('/api/finance/reconcile', [
            'student_id' => $student->id,
            'academic_session_id' => $session->id,
        ])->assertOk()
            ->assertJsonPath('data.student_id', $student->id)
            ->assertJsonPath('data.reconciled_sessions', 1);

        $invoice->refresh();

        $this->assertSame(800.0, (float) $invoice->amount_due);
    }

    public function test_reconcile_finance_command_executes_without_error(): void
    {
        $session = AcademicSession::factory()->active()->create();
        $student = Student::factory()->create();
        Invoice::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $session->id,
            'amount_due' => 500,
        ]);

        $this->artisan('finance:reconcile')
            ->assertSuccessful();
    }

    public function test_dashboard_empty_course_filter_returns_no_finance_totals(): void
    {
        Invoice::factory()->create(['amount_due' => 1000, 'computed_amount' => 1000]);

        $missingCourseId = '00000000-0000-4000-8000-000000000000';

        $this->getJson("/api/finance/dashboard?course_id={$missingCourseId}")
            ->assertOk()
            ->assertJsonPath('data.summary.total_invoiced', 0);
    }
    public function test_dashboard_session_filter_counts_only_allocations_for_that_session(): void
    {
        $firstSession = AcademicSession::factory()->active()->create([
            'start_date' => '2026-01-01',
            'end_date' => '2026-03-31',
        ]);
        $secondSession = AcademicSession::factory()->active()->create([
            'start_date' => '2026-04-01',
            'end_date' => '2026-06-30',
        ]);
        $student = Student::factory()->create();

        $firstInvoice = Invoice::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $firstSession->id,
            'issue_date' => '2026-01-01',
        ]);
        InvoiceLineItem::factory()->create([
            'invoice_id' => $firstInvoice->id,
            'name' => 'Session one fees',
            'amount' => 400,
            'quantity' => 1,
            'total_amount' => 400,
        ]);
        $firstInvoice->recalculateTotals();

        $secondInvoice = Invoice::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $secondSession->id,
            'issue_date' => '2026-04-01',
        ]);
        InvoiceLineItem::factory()->create([
            'invoice_id' => $secondInvoice->id,
            'name' => 'Session two fees',
            'amount' => 600,
            'quantity' => 1,
            'total_amount' => 600,
        ]);
        $secondInvoice->recalculateTotals();

        app(BillingService::class)->recordStudentPayment(
            $student,
            1000,
            'cash',
            $this->admin->id,
            'MULTI-SESSION-001',
        );

        $this->getJson("/api/finance/dashboard?academic_session_id={$firstSession->id}")
            ->assertOk()
            ->assertJsonPath('data.summary.total_collected', 400);
    }
    public function test_assigning_a_fee_template_does_not_mark_it_as_issued_before_invoicing(): void
    {
        $session = AcademicSession::factory()->create();
        $courseCurriculum = CourseCurriculum::factory()->create();
        $template = FeeTemplate::create([
            'code' => 'ASSIGN-001',
            'name' => 'Assignable fees',
            'type' => 'fees',
            'is_active' => true,
            'is_issued' => false,
        ]);

        $assignmentId = $this->postJson("/api/fee-templates/{$template->id}/course-assignments", [
            'course_curriculum_id' => $courseCurriculum->id,
            'academic_session_id' => $session->id,
            'year_level' => 1,
            'session_number' => 1,
            'is_approved' => false,
        ])->assertCreated()
            ->json('data.id');

        $this->assertFalse($template->fresh()->is_issued);

        $this->putJson("/api/fee-templates/{$template->id}/course-assignments/{$assignmentId}", [
            'is_approved' => true,
        ])->assertOk()
            ->assertJsonPath('data.is_approved', true);
    }

    public function test_fee_template_components_must_have_a_positive_amount(): void
    {
        $template = FeeTemplate::create([
            'code' => 'POSITIVE-001',
            'name' => 'Positive fees',
            'type' => 'fees',
            'is_active' => true,
        ]);

        $this->postJson('/api/fee-template-items', [
            'fee_template_id' => $template->id,
            'name' => 'Invalid zero fee',
            'amount' => 0,
            'is_active' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('amount');
    }
    public function test_penalty_is_created_as_an_independent_invoice(): void
    {
        AcademicSession::factory()->active()->create();
        $student = Student::factory()->create();

        $penaltyInvoiceId = $this->postJson('/api/invoice-charges', [
            'student_id' => $student->id,
            'charge_type' => 'penalty',
            'amount' => 200,
            'description' => 'Late registration penalty',
        ])->assertCreated()
            ->assertJsonPath('data.invoice_type', 'penalty')
            ->assertJsonPath('data.amount', 200)
            ->json('data.id');

        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseHas('invoices', [
            'id' => $penaltyInvoiceId,
            'student_id' => $student->id,
            'invoice_type' => 'penalty',
            'fee_template_id' => null,
            'amount_due' => 200,
        ]);
    }
    public function test_student_dashboard_shows_credit_as_a_negative_net_balance(): void
    {
        $session = AcademicSession::factory()->active()->create();
        $student = Student::factory()->create();

        Invoice::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $session->id,
            'amount_due' => 500,
            'computed_amount' => 500,
            'status' => 'issued',
        ]);
        Payment::create([
            'student_id' => $student->id,
            'amount' => 11000,
            'payment_date' => now()->toDateString(),
            'method' => 'cash',
            'reference' => 'CREDIT-11000',
            'status' => 'completed',
            'idempotency_key' => 'credit-11000-dashboard',
        ]);

        Sanctum::actingAs($student->user);

        $this->getJson('/api/student/dashboard')
            ->assertOk()
            ->assertJsonPath('data.finance.outstanding_balance', 500)
            ->assertJsonPath('data.finance.unallocated_credit', 11000)
            ->assertJsonPath('data.finance.net_balance', -10500);
    }
    public function test_non_graduated_student_cannot_receive_a_refund(): void
    {
        AcademicSession::factory()->active()->create();
        $student = Student::factory()->create(['status' => StudentStatus::Cleared]);

        app(BillingService::class)->recordStudentPayment(
            $student,
            500,
            'cash',
            $this->admin->id,
            'REFUND-CREDIT-NOT-GRADUATED',
        );

        $this->postJson('/api/refunds', [
            'student_id' => $student->id,
            'amount' => 200,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('student');
    }

    public function test_graduated_student_lookup_excludes_non_graduated_students(): void
    {
        $graduated = Student::factory()->create([
            'status' => StudentStatus::Graduated,
            'admission_number' => 'GRAD-LOOKUP-001',
        ]);
        Student::factory()->create([
            'status' => StudentStatus::Active,
            'admission_number' => 'GRAD-LOOKUP-002',
        ]);

        $this->getJson('/api/lookups/students?q=GRAD-LOOKUP&status=graduated')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $graduated->id)
            ->assertJsonPath('data.0.status', 'graduated');
    }
    public function test_fee_assignments_search_by_course_name_and_paginate(): void
    {
        $businessCourse = Course::factory()->create(['name' => 'Diploma in Business Management']);
        $engineeringCourse = Course::factory()->create(['name' => 'Electrical Engineering']);
        $businessMapping = CourseCurriculum::factory()->create(['course_id' => $businessCourse->id]);
        $engineeringMapping = CourseCurriculum::factory()->create(['course_id' => $engineeringCourse->id]);
        $template = FeeTemplate::create([
            'code' => 'FILTERED-ASSIGNMENTS',
            'name' => 'Filterable assignments',
            'type' => 'fees',
            'is_active' => true,
        ]);

        foreach ([$businessMapping, $engineeringMapping] as $mapping) {
            CurriculumFeeAssignment::create([
                'course_curriculum_id' => $mapping->id,
                'fee_template_id' => $template->id,
                'issuance_type' => 'per_year',
                'dormant' => true,
                'split_amount' => 3000,
                'split_ratio' => 100,
                'year_level' => 1,
                'session_number' => 0,
                'is_approved' => false,
            ]);
        }

        $this->getJson("/api/fee-templates/{$template->id}/course-assignments?q=Business&per_page=1")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.course_name', 'Diploma in Business Management')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.current_page', 1);

        $this->getJson("/api/fee-templates/{$template->id}/course-assignments?per_page=1&page=2")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 2);
    }
    public function test_department_assignment_applies_to_a_course_in_that_department(): void
    {
        $session = AcademicSession::factory()->active()->create();
        $mapping = CourseCurriculum::factory()->create();
        $mapping->load('course');
        $student = Student::factory()->create();
        CourseEnrolment::factory()->create([
            'student_id' => $student->id,
            'course_curriculum_id' => $mapping->id,
            'academic_session_id' => $session->id,
            'status' => 'enrolled',
        ]);
        AcademicSessionEnrolment::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $session->id,
            'year_of_study' => 2,
            'session_number' => 2,
            'module' => 5,
            'status' => 'enrolled',
        ]);
        $template = FeeTemplate::create([
            'code' => 'DEPARTMENT-FEE',
            'name' => 'Department shared fee',
            'type' => 'fees',
            'is_active' => true,
        ]);
        FeeTemplateItem::create([
            'fee_template_id' => $template->id,
            'name' => 'Shared department charge',
            'amount' => 2500,
            'is_active' => true,
        ]);

        $this->postJson("/api/fee-templates/{$template->id}/course-assignments", [
            'assignment_scope' => 'department',
            'department_id' => $mapping->course->department_id,
            'issuance_type' => 'per_session',
            'year_level' => 2,
            'session_number' => 2,
            'is_approved' => true,
        ])->assertCreated()
            ->assertJsonPath('data.assignment_scope', 'department')
            ->assertJsonPath('data.department_id', $mapping->course->department_id);

        $invoice = app(BillingService::class)->createInvoiceForStudent($student, $this->admin->id, $session);

        $this->assertSame(2500.0, (float) $invoice->fresh()->amount_due);
    }
    public function test_all_years_assignment_applies_to_a_year_four_student(): void
    {
        $session = AcademicSession::factory()->active()->create();
        $student = Student::factory()->create();
        $mapping = CourseCurriculum::factory()->create();
        CourseEnrolment::factory()->create([
            'student_id' => $student->id,
            'course_curriculum_id' => $mapping->id,
            'academic_session_id' => $session->id,
            'status' => 'enrolled',
        ]);
        AcademicSessionEnrolment::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $session->id,
            'year_of_study' => 4,
            'session_number' => 1,
            'module' => 10,
            'status' => 'enrolled',
        ]);
        $template = FeeTemplate::create([
            'code' => 'ALL-YEARS-FEE',
            'name' => 'All years fee',
            'type' => 'fees',
            'is_active' => true,
        ]);
        FeeTemplateItem::create([
            'fee_template_id' => $template->id,
            'name' => 'Course fee',
            'amount' => 4000,
            'is_active' => true,
        ]);
        CurriculumFeeAssignment::create([
            'course_curriculum_id' => $mapping->id,
            'fee_template_id' => $template->id,
            'academic_session_id' => null,
            'issuance_type' => 'per_session',
            'dormant' => false,
            'year_level' => CurriculumFeeAssignment::ALL_YEAR_LEVELS,
            'session_number' => 1,
            'is_approved' => true,
        ]);

        $invoice = app(BillingService::class)->createInvoiceForStudent($student, $this->admin->id, $session);

        $this->assertSame(4000.0, (float) $invoice->fresh()->amount_due);
    }
    public function test_per_session_assignment_uses_progression_session_without_an_academic_session(): void
    {
        $mapping = CourseCurriculum::factory()->create();
        $template = FeeTemplate::create([
            'code' => 'SESSION-PROGRESSION',
            'name' => 'Progression session fee',
            'type' => 'fees',
            'is_active' => true,
        ]);

        $this->postJson("/api/fee-templates/{$template->id}/course-assignments", [
            'course_curriculum_id' => $mapping->id,
            'issuance_type' => 'per_session',
            'year_level' => 2,
            'session_number' => 3,
            'is_approved' => false,
        ])->assertCreated()
            ->assertJsonPath('data.academic_session_id', null)
            ->assertJsonPath('data.session_number', 3);
    }
    public function test_academic_year_creation_generates_three_inactive_sessions(): void
    {
        $response = $this->postJson('/api/academic-years', [
            'code' => '2027-2028',
            'name' => 'Academic Year 2027/2028',
            'start_date' => '2027-09-01',
            'end_date' => '2028-08-31',
            'is_active' => false,
        ])->assertCreated();

        $year = AcademicYear::findOrFail($response->json('data.id'));
        $this->assertCount(3, $year->sessions);
        $this->assertFalse($year->sessions->contains(fn (AcademicSession $session) => $session->is_active));
    }

    public function test_yearly_fee_is_split_exactly_and_dormant_portion_activates_with_its_session(): void
    {
        $year = AcademicYear::factory()->active()->create();
        $sessions = collect([
            AcademicSession::factory()->inactive()->for($year, 'year')->create(['start_date' => '2027-09-01', 'end_date' => '2027-12-01']),
            AcademicSession::factory()->inactive()->for($year, 'year')->create(['start_date' => '2028-01-01', 'end_date' => '2028-04-01']),
            AcademicSession::factory()->inactive()->for($year, 'year')->create(['start_date' => '2028-05-01', 'end_date' => '2028-08-01']),
        ]);
        $courseCurriculum = CourseCurriculum::factory()->create();
        $template = FeeTemplate::create(['code' => 'YEARLY-001', 'name' => 'Annual tuition', 'type' => 'fees', 'is_active' => true]);
        FeeTemplateItem::create(['fee_template_id' => $template->id, 'name' => 'Tuition', 'amount' => 10001, 'is_active' => true]);

        $parentId = $this->postJson("/api/fee-templates/{$template->id}/course-assignments", [
            'course_curriculum_id' => $courseCurriculum->id,
            'academic_year_id' => $year->id,
            'issuance_type' => 'per_year',
            'year_level' => 1,
            'split_ratios' => [40, 30, 30],
            'is_approved' => true,
        ])->assertCreated()->json('data.id');

        $portions = CurriculumFeeAssignment::where('parent_assignment_id', $parentId)->orderBy('session_number')->get();
        $this->assertCount(3, $portions);
        $this->assertSame(10001.0, (float) $portions->sum('split_amount'));
        $this->assertTrue($portions->every(fn (CurriculumFeeAssignment $portion) => $portion->dormant));

        $sessions[1]->update(['is_active' => true]);
        $this->assertFalse($portions[1]->fresh()->dormant);
        $this->assertTrue($portions[0]->fresh()->dormant);
    }

    public function test_dormant_fee_edit_is_audited_and_preserves_annual_total(): void
    {
        $year = AcademicYear::factory()->active()->create();
        $sessions = collect([
            AcademicSession::factory()->inactive()->for($year, 'year')->create(['start_date' => '2029-01-01']),
            AcademicSession::factory()->inactive()->for($year, 'year')->create(['start_date' => '2029-05-01']),
            AcademicSession::factory()->inactive()->for($year, 'year')->create(['start_date' => '2029-09-01']),
        ]);
        $mapping = CourseCurriculum::factory()->create();
        $template = FeeTemplate::create(['code' => 'YEARLY-EDIT', 'name' => 'Editable annual fee', 'type' => 'fees', 'is_active' => true]);
        FeeTemplateItem::create(['fee_template_id' => $template->id, 'name' => 'Annual fee', 'amount' => 9000, 'is_active' => true]);
        $parentId = $this->postJson("/api/fee-templates/{$template->id}/course-assignments", [
            'course_curriculum_id' => $mapping->id,
            'academic_year_id' => $year->id,
            'issuance_type' => 'per_year',
            'year_level' => 1,
            'is_approved' => true,
        ])->assertCreated()->json('data.id');
        $portion = CurriculumFeeAssignment::where('parent_assignment_id', $parentId)->where('session_number', 2)->firstOrFail();

        $this->putJson("/api/fee-templates/{$template->id}/course-assignments/{$portion->id}", [
            'split_amount' => 3500,
            'reason' => 'Sponsor requested revised future split',
        ])->assertOk();

        $this->assertSame(9000.0, (float) CurriculumFeeAssignment::where('parent_assignment_id', $parentId)->sum('split_amount'));
        $this->assertDatabaseHas('fee_assignment_audits', ['curriculum_fee_assignment_id' => $portion->id, 'old_value' => '3000', 'new_value' => '3500']);
    }
}