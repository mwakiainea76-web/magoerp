<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\AcademicYear;
use App\Models\CertificationAuthority;
use App\Models\CertificationLevel;
use App\Models\Course;
use App\Models\CourseCurriculum;
use App\Models\Curriculum;
use App\Models\Departments;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicModuleTest extends TestCase
{
    private User $admin;
    private User $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        $this->student = User::factory()->student()->create();
    }

    /** @dataProvider crudResources */
    public function test_admin_can_list(string $uri): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson($uri)->assertOk();
    }

    public static function crudResources(): array
    {
        return [
            'departments' => ['/api/departments'],
            'courses' => ['/api/courses'],
            'curricula' => ['/api/curricula'],
            'course-curricula' => ['/api/course-curricula'],
            'units' => ['/api/units'],
            'academic-years' => ['/api/academic-years'],
            'academic-sessions' => ['/api/academic-sessions'],
            'academic-session-enrolments' => ['/api/academic-session-enrolments'],
            'certification-authorities' => ['/api/certification-authorities'],
            'certification-levels' => ['/api/certification-levels'],
        ];
    }

    public function test_unauthenticated_user_cannot_access(): void
    {
        $this->getJson('/api/departments')->assertUnauthorized();
    }

    public function test_admin_can_create_department(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/departments', ['code' => 'CS', 'name' => 'Computer Science'])
            ->assertCreated();
    }

    public function test_admin_can_update_department(): void
    {
        Sanctum::actingAs($this->admin);
        $dept = Departments::factory()->create();
        $this->putJson("/api/departments/{$dept->id}", [
            'code' => $dept->code, 'name' => 'Updated',
        ])->assertOk();
    }

    public function test_admin_can_delete_department(): void
    {
        Sanctum::actingAs($this->admin);
        $dept = Departments::factory()->create();
        $this->deleteJson("/api/departments/{$dept->id}")->assertOk();
    }

    public function test_admin_can_create_course(): void
    {
        Sanctum::actingAs($this->admin);
        $a = CertificationAuthority::factory()->create();
        $l = CertificationLevel::factory()->create();
        $d = Departments::factory()->create();

        $this->postJson('/api/courses', [
            'code' => 'DIT', 'name' => 'Diploma in IT', 'initials' => 'DIT',
            'certification_authority_id' => $a->id, 'certification_level_id' => $l->id,
            'department_id' => $d->id, 'duration_months' => 36, 'is_active' => true,
        ])->assertCreated();
    }

    public function test_create_course_validates(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/courses', [])->assertUnprocessable();
    }

    public function test_student_can_view_units(): void
    {
        Sanctum::actingAs($this->student);
        $this->getJson('/api/units')->assertOk();
    }

    public function test_student_cannot_create_unit(): void
    {
        Sanctum::actingAs($this->student);
        $this->postJson('/api/units', [])->assertForbidden();
    }

    public function test_admin_can_create_unit(): void
    {
        Sanctum::actingAs($this->admin);
        $cc = CourseCurriculum::factory()->create();
        $this->postJson('/api/units', [
            'course_curriculum_id' => $cc->id, 'code' => 'ICT101',
            'name' => 'Intro to Programming', 'year_of_study' => 1,
            'session_number' => 1, 'modules_taught' => 3, 'is_active' => true,
        ])->assertCreated();
    }

    public function test_admin_can_create_academic_session(): void
    {
        Sanctum::actingAs($this->admin);
        $year = AcademicYear::factory()->create();
        $this->postJson('/api/academic-sessions', [
            'academic_year_id' => $year->id, 'name' => 'Sem 1 2026',
            'code' => 'S1-2026', 'start_date' => '2026-01-15',
            'end_date' => '2026-05-15', 'is_active' => true,
        ])->assertCreated();
    }

    public function test_enrolment_unit_route_is_reachable(): void
    {
        Sanctum::actingAs($this->admin);
        // The route itself resolves (returns 422 validation, not 404 ModelNotFound)
        $this->getJson('/api/academic-session-enrolments/unit')
            ->assertStatus(422);
    }

    public function test_student_cannot_create_enrolment(): void
    {
        Sanctum::actingAs($this->student);
        $this->postJson('/api/academic-session-enrolments', [])->assertForbidden();
    }
}
