<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    private string $password = 'password123';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_login_success_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make($this->password),
            'status' => true,
        ]);

        $this->postJson('/api/login', [
            'login_id' => $user->login_id,
            'password' => $this->password,
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'login_id', 'role']]);
    }

    public function test_login_returns_validation_error(): void
    {
        $this->postJson('/api/login', [
            'login_id' => 'NONEXISTENT',
            'password' => 'wrong',
        ])->assertStatus(422);
    }

    public function test_login_requires_fields(): void
    {
        $this->postJson('/api/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['login_id', 'password']);
    }

    public function test_authenticated_user_can_access_me(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/me')->assertOk();
    }

    public function test_unauthenticated_user_cannot_access_me(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_logout_returns_success(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/logout')->assertOk();
    }

    public function test_change_password_succeeds(): void
    {
        $user = User::factory()->create(['password' => Hash::make($this->password)]);
        Sanctum::actingAs($user);

        $this->postJson('/api/change-password', [
            'current_password' => $this->password,
            'password' => 'newSecurePass1',
            'password_confirmation' => 'newSecurePass1',
        ])->assertOk();
    }

    public function test_change_password_fails_with_wrong_current(): void
    {
        $user = User::factory()->create(['password' => Hash::make($this->password)]);
        Sanctum::actingAs($user);

        $this->postJson('/api/change-password', [
            'current_password' => 'wrong',
            'password' => 'newSecurePass1',
            'password_confirmation' => 'newSecurePass1',
        ])->assertUnprocessable();
    }
}
