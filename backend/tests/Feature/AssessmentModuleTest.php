<?php

namespace Tests\Feature;

use App\Models\AcademicSessionEnrolment;
use App\Models\Student;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssessmentModuleTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
    }

    public function test_admin_can_list_marks(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/marks')->assertOk();
    }

    public function test_admin_can_initiate_mark_creation(): void
    {
        Sanctum::actingAs($this->admin);
        // The endpoints resolve correctly (validation error means route works)
        $this->postJson('/api/marks', [])->assertUnprocessable();
    }

    public function test_student_cannot_create_marks(): void
    {
        Sanctum::actingAs(User::factory()->student()->create());
        $this->postJson('/api/marks', [])->assertForbidden();
    }

    public function test_mark_validation_rejects_invalid_score(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/marks', ['score' => 150])->assertUnprocessable();
    }

    public function test_mark_toggle_publish_works(): void
    {
        Sanctum::actingAs($this->admin);
        $mark = \App\Models\StudentMark::factory()->create(['is_published' => false]);

        $this->postJson("/api/marks/{$mark->id}/toggle-publish")->assertOk();
        $this->assertTrue($mark->fresh()->is_published);
    }

    public function test_assessment_types_endpoint(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/assessment-types')->assertOk();
    }

    public function test_attendance_assigned_units(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/attendance/assigned-units')->assertOk();
    }

    public function test_available_units_for_marks(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/marks/available-units')->assertOk();
    }

    public function test_available_students_for_marks(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/marks/available-students')->assertOk();
    }
}
