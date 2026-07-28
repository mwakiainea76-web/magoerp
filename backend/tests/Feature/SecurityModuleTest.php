<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityModuleTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_security_dashboard(): void
    {
        $this->getJson('/api/security/dashboard')->assertOk();
    }

    public function test_list_security_events(): void
    {
        $this->getJson('/api/security/events')->assertOk();
    }

    public function test_list_sessions(): void
    {
        $this->getJson('/api/security/sessions')->assertOk();
    }

    public function test_list_devices(): void
    {
        $this->getJson('/api/security/devices')->assertOk();
    }

    public function test_list_blocked_ips(): void
    {
        $this->getJson('/api/security/blocked/ips')->assertOk();
    }

    public function test_list_blocked_users(): void
    {
        $this->getJson('/api/security/blocked/users')->assertOk();
    }

    public function test_list_blocked_devices(): void
    {
        $this->getJson('/api/security/blocked/devices')->assertOk();
    }

    public function test_list_blocked_sessions(): void
    {
        $this->getJson('/api/security/blocked/sessions')->assertOk();
    }

    public function test_block_ip(): void
    {
        $this->postJson('/api/security/blocked/ips', [
            'ip_address' => '10.0.0.5',
            'reason' => 'Suspicious activity',
        ])->assertCreated();
    }

    public function test_block_user(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/security/blocked/users', [
            'user_id' => $user->id,
            'reason' => 'Policy violation',
        ])->assertCreated();
    }

    public function test_api_monitoring_logs(): void
    {
        $this->getJson('/api/monitoring/logs')->assertOk();
    }

    public function test_api_monitoring_stats(): void
    {
        $this->getJson('/api/monitoring/logs/stats')->assertOk();
    }
}
