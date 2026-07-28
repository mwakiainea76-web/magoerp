<?php

namespace Tests\Feature;

use App\Models\AcademicSessionEnrolment;
use App\Models\Hostel;
use App\Models\HostelRoom;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HostelModuleTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_list_rooms(): void
    {
        $this->getJson('/api/hostel-rooms')->assertOk();
    }

    public function test_create_room(): void
    {
        $hostel = Hostel::factory()->create();
        $this->postJson('/api/hostel-rooms', [
            'hostel_id' => $hostel->id, 'name' => 'Room A101',
            'code' => 'RA101', 'floor' => '1', 'bed_count' => 4,
        ])->assertCreated();
    }

    public function test_view_room(): void
    {
        $room = HostelRoom::factory()->create();
        $this->getJson("/api/hostel-rooms/{$room->id}")->assertOk();
    }

    public function test_update_room(): void
    {
        $room = HostelRoom::factory()->create();
        $this->putJson("/api/hostel-rooms/{$room->id}", ['name' => 'Updated'])
            ->assertOk();
    }

    public function test_list_allocations(): void
    {
        $this->getJson('/api/hostel-allocations')->assertOk();
    }

    public function test_create_allocation(): void
    {
        $room = HostelRoom::factory()->create();
        $enrolment = AcademicSessionEnrolment::factory()->create();
        $hostel = Hostel::factory()->create();
        $bed = \App\Models\HostelBed::factory()->create(['hostel_room_id' => $room->id]);

        $this->postJson('/api/hostel-allocations', [
            'hostel_id' => $hostel->id,
            'hostel_room_id' => $room->id,
            'hostel_bed_id' => $bed->id,
            'academic_session_enrolment_id' => $enrolment->id,
            'allocated_on' => now()->toDateString(),
        ])->assertCreated();
    }
}
