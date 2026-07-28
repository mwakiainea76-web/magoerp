<?php

namespace Tests\Feature;

use App\Models\AcademicSessionEnrolment;
use App\Models\SupportRequest;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RouteOrderingTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_support_requests_staff_list_is_reachable(): void
    {
        $this->getJson('/api/support-requests/staff-list')->assertOk();
    }

    public function test_support_request_show_still_works(): void
    {
        $request = SupportRequest::factory()->create();
        $request->load('student.user');
        $this->getJson("/api/support-requests/{$request->id}")->assertOk();
    }

    public function test_academic_session_enrolments_unit_is_reachable(): void
    {
        $enrolment = AcademicSessionEnrolment::factory()->create();

        $response = $this->getJson('/api/academic-session-enrolments/unit?' . http_build_query([
            'unit_id' => $enrolment->unit_id ?? '00000000-0000-0000-0000-000000000000',
            'academic_session_id' => $enrolment->academic_session_id,
        ]));

        $response->assertStatus(422);
    }

    public function test_academic_session_enrolment_show_still_works(): void
    {
        $enrolment = AcademicSessionEnrolment::factory()->create();
        $this->getJson("/api/academic-session-enrolments/{$enrolment->id}")->assertOk();
    }

    public function test_exam_series_available_sessions_is_reachable(): void
    {
        $this->getJson('/api/exam-series/available-sessions')->assertOk();
    }

    public function test_exam_series_options_is_reachable(): void
    {
        $this->getJson('/api/exam-series/options')->assertOk();
    }

    public function test_index_routes_work(): void
    {
        $this->getJson('/api/academic-session-enrolments')->assertOk();
        $this->getJson('/api/support-requests')->assertOk();
    }
}
