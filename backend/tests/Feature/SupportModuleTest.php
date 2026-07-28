<?php

namespace Tests\Feature;

use App\Models\Staffs;
use App\Models\Student;
use App\Models\SupportRequest;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupportModuleTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
    }

    public function test_admin_can_list_all_requests(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/support-requests')->assertOk();
    }

    public function test_student_can_view_own_requests(): void
    {
        $studentUser = User::factory()->student()->create();
        Student::factory()->create(['user_id' => $studentUser->id]);
        Sanctum::actingAs($studentUser);
        $this->getJson('/api/my/support-requests')->assertOk();
    }

    public function test_admin_can_view_request_detail(): void
    {
        Sanctum::actingAs($this->admin);
        $request = SupportRequest::factory()->create();
        $request->load('student.user');
        $this->getJson("/api/support-requests/{$request->id}")->assertOk();
    }

    public function test_admin_can_resolve_request(): void
    {
        Sanctum::actingAs($this->admin);
        $request = SupportRequest::factory()->create();
        $request->load('student.user');
        $this->postJson("/api/support-requests/{$request->id}/resolve", [
            'admin_notes' => 'Fixed.',
        ])->assertOk();
    }

    public function test_unauthenticated_user_cannot_access(): void
    {
        $this->getJson('/api/support-requests')->assertUnauthorized();
    }
}
