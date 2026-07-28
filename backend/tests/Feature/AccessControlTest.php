<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_list_roles(): void
    {
        $this->getJson('/api/access-roles')->assertOk();
    }

    public function test_create_role(): void
    {
        $this->postJson('/api/access-roles', [
            'name' => 'exam_officer',
            'guard_name' => 'web',
        ])->assertCreated();
    }

    public function test_update_role(): void
    {
        $role = Role::factory()->create();
        $this->putJson("/api/access-roles/{$role->id}", [
            'name' => 'updated_role',
            'guard_name' => 'web',
        ])->assertOk();
    }

    public function test_delete_role(): void
    {
        $role = Role::factory()->create();
        $this->deleteJson("/api/access-roles/{$role->id}")->assertOk();
    }

    public function test_view_role_permissions_grouped(): void
    {
        $role = Role::factory()->create();
        $this->getJson("/api/access-roles/{$role->id}/permissions/grouped")->assertOk();
    }

    public function test_sync_role_permissions(): void
    {
        $role = Role::factory()->create();
        $perm = Permission::factory()->create();

        $this->putJson("/api/access-roles/{$role->id}/permissions", [
            'permission_ids' => [$perm->id],
        ])->assertOk();
    }

    public function test_student_cannot_manage_roles(): void
    {
        Sanctum::actingAs(User::factory()->student()->create());
        $this->getJson('/api/access-roles')->assertForbidden();
    }
}
