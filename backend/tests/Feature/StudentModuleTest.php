<?php

namespace Tests\Feature;

use App\Models\CourseCurriculum;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentModuleTest extends TestCase
{
    private User $admin;
    private User $studentUser;
    private array $studentPayload;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        $this->studentUser = User::factory()->student()->create();
        $courseCurr = CourseCurriculum::factory()->create();

        $this->studentPayload = [
            'first_name' => 'John', 'middle_name' => 'M', 'last_name' => 'Doe',
            'email' => 'john.doe@example.com', 'gender' => 'male',
            'date_of_birth' => '2000-05-15', 'nationality' => 'Kenyan',
            'national_id' => '87654321', 'place_of_birth' => 'Nairobi',
            'religion' => 'Christian', 'phone_number' => '0712345678',
            'alternative_phone_number' => '0723456789', 'county' => 'Nairobi',
            'is_pwd' => false, 'status' => 'active',
            'next_of_kin_first_name' => 'Jane', 'next_of_kin_last_name' => 'Doe',
            'next_of_kin_phone' => '0734567890', 'next_of_kin_alt_phone' => '0745678901',
            'next_of_kin_email' => 'jane.doe@example.com',
            'next_of_kin_relationship' => 'Father',
        ];
    }

    public function test_admin_can_list_students(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/students')->assertOk();
    }

    public function test_admin_can_view_student(): void
    {
        Sanctum::actingAs($this->admin);
        $student = Student::factory()->create();
        $this->getJson("/api/students/{$student->id}")->assertOk();
    }

    public function test_admin_can_delete_student(): void
    {
        Sanctum::actingAs($this->admin);
        $student = Student::factory()->create();
        $this->deleteJson("/api/students/{$student->id}")->assertOk();
        $this->assertSoftDeleted($student);
    }

    public function test_meta_endpoint_requires_permission(): void
    {
        Sanctum::actingAs($this->studentUser);
        $this->getJson('/api/students/meta')->assertForbidden();
    }

    public function test_student_cannot_list_all(): void
    {
        Sanctum::actingAs($this->studentUser);
        $this->getJson('/api/students')->assertForbidden();
    }
}
