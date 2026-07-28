<?php

namespace Tests\Feature;

use App\Models\CertificationAuthority;
use App\Models\CertificationLevel;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CertificationModuleTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_list_authorities(): void
    {
        $this->getJson('/api/certification-authorities')->assertOk();
    }

    public function test_create_authority(): void
    {
        $this->postJson('/api/certification-authorities', [
            'name' => 'KNEC', 'code' => 'KNEC', 'is_active' => true,
        ])->assertCreated();
    }

    public function test_create_authority_validates(): void
    {
        $this->postJson('/api/certification-authorities', [])->assertUnprocessable();
    }

    public function test_view_authority(): void
    {
        $a = CertificationAuthority::factory()->create();
        $this->getJson("/api/certification-authorities/{$a->id}")->assertOk();
    }

    public function test_update_authority(): void
    {
        $a = CertificationAuthority::factory()->create();
        $this->putJson("/api/certification-authorities/{$a->id}", [
            'name' => 'Updated', 'code' => $a->code, 'is_active' => true,
        ])->assertOk();
    }

    public function test_delete_authority(): void
    {
        $a = CertificationAuthority::factory()->create();
        $this->deleteJson("/api/certification-authorities/{$a->id}")->assertOk();
    }

    public function test_create_level(): void
    {
        $auth = CertificationAuthority::factory()->create();
        $this->postJson('/api/certification-levels', [
            'certification_authority_id' => $auth->id,
            'name' => 'Diploma', 'code' => 'DIP',
            'sort_order' => 1, 'is_active' => true,
        ])->assertCreated();
    }

    public function test_update_level(): void
    {
        $level = CertificationLevel::factory()->create();
        $this->putJson("/api/certification-levels/{$level->id}", [
            'certification_authority_id' => $level->certification_authority_id,
            'name' => 'Advanced Diploma', 'code' => $level->code, 'is_active' => true,
        ])->assertOk();
    }

    public function test_delete_level(): void
    {
        $level = CertificationLevel::factory()->create();
        $this->deleteJson("/api/certification-levels/{$level->id}")->assertOk();
    }
}
