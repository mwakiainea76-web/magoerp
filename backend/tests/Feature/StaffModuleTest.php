<?php

namespace Tests\Feature;

use App\Models\Departments;
use App\Models\Staffs;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffModuleTest extends TestCase
{
    private User $admin;
    private User $studentUser;
    private array $staffPayload;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        $this->studentUser = User::factory()->student()->create();
        $dept = Departments::factory()->create();

        $this->staffPayload = [
            'first_name' => 'Jane', 'middle_name' => 'W', 'last_name' => 'Smith',
            'email' => 'jane.smith@example.com', 'gender' => 'female',
            'date_of_birth' => '1990-01-15', 'nationality' => 'Kenyan',
            'national_id' => '12345678', 'place_of_birth' => 'Nairobi',
            'religion' => 'Christian', 'phone_number' => '0712345678',
            'county' => 'Nairobi', 'department_id' => $dept->id,
            'job_title' => 'Lecturer', 'employment_type' => 'Permanent',
            'basic_salary' => 80000, 'kra_pin' => 'KRA123456',
            'nhif_number' => 'NHIF12345', 'nssf_number' => 'NSSF12345',
            'highest_qualification' => 'Masters', 'specialization' => 'CS',
            'is_pwd' => false, 'status' => true,
            'next_of_kin_first_name' => 'John', 'next_of_kin_last_name' => 'Smith',
            'next_of_kin_phone' => '0723456789', 'next_of_kin_alt_phone' => '0734567890',
            'next_of_kin_email' => 'next@example.com',
            'next_of_kin_relationship' => 'Partner',
            'role' => 'trainer', 'password' => 'securePass123',
            'password_confirmation' => 'securePass123',
        ];
    }

    public function test_admin_can_list_staff(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/staffs')->assertOk();
    }

    public function test_admin_can_create_staff(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/staffs', $this->staffPayload)->assertCreated();
    }

    public function test_create_staff_validates(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/staffs', [])->assertUnprocessable();
    }

    public function test_admin_can_view_staff(): void
    {
        Sanctum::actingAs($this->admin);
        $staff = Staffs::factory()->create();
        $this->getJson("/api/staffs/{$staff->id}")->assertOk();
    }

    public function test_admin_can_delete_staff(): void
    {
        Sanctum::actingAs($this->admin);
        $staff = Staffs::factory()->create();
        $this->deleteJson("/api/staffs/{$staff->id}")->assertOk();
        $this->assertSoftDeleted($staff);
    }

    public function test_meta_endpoint_requires_permission(): void
    {
        Sanctum::actingAs($this->studentUser);
        $this->getJson('/api/staffs/meta')->assertForbidden();
    }

    public function test_meta_endpoint_with_admin(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/staffs/meta')->assertOk();
    }

    public function test_student_cannot_list_staff(): void
    {
        Sanctum::actingAs($this->studentUser);
        $this->getJson('/api/staffs')->assertForbidden();
    }
}
