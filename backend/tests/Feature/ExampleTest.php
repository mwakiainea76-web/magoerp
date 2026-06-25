<?php

namespace Tests\Feature;

use Database\Seeders\TestDatabaseSeeder;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_seeds_and_returns_login_page(): void
    {
        $this->seed(TestDatabaseSeeder::class);

        $response = $this->postJson('/api/login', [
            'login_id' => 'EMP-ADMIN-001',
            'password' => 'Admin@12345',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'login_id', 'role', 'roles', 'permissions'],
            ]);
    }

    public function test_login_with_unregistered_username(): void
    {
        $this->seed(TestDatabaseSeeder::class);

        $response = $this->postJson('/api/login', [
            'login_id' => 'NONEXISTENT',
            'password' => 'anything',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Your account with this username is not registered.',
            ]);
    }

    public function test_login_with_wrong_password(): void
    {
        $this->seed(TestDatabaseSeeder::class);

        $response = $this->postJson('/api/login', [
            'login_id' => 'EMP-ADMIN-001',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Invalid login credentials.',
            ]);
    }
}
