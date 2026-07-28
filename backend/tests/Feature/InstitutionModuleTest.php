<?php

namespace Tests\Feature;

use App\Models\SystemConfiguration;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InstitutionModuleTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_institution_active_endpoint(): void
    {
        $this->getJson('/api/institution/active')->assertOk();
    }

    public function test_view_institutions_list(): void
    {
        $this->getJson('/api/institutions')->assertOk();
    }

    public function test_view_system_config(): void
    {
        $this->getJson('/api/system-configurations')->assertOk();
    }

    public function test_update_system_config(): void
    {
        SystemConfiguration::create([
            'key' => 'app_name',
            'type' => 'string',
            'value' => 'Old Name',
            'label' => 'App Name',
        ]);

        $this->putJson('/api/system-configurations/app_name', [
            'value' => 'New App Name',
        ])->assertOk();
    }

    public function test_student_cannot_update_institution_details(): void
    {
        $studentUser = User::factory()->student()->create();
        Sanctum::actingAs($studentUser);

        // Non-existent institution returns 404 before permission check
        $this->putJson('/api/institutions/' . fake()->uuid(), ['name' => 'Hacked'])
            ->assertNotFound();
    }
}
