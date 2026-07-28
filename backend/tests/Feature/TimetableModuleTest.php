<?php

namespace Tests\Feature;

use App\Models\AcademicTimetable;
use App\Models\LectureRoom;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TimetableModuleTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_list_timetables(): void
    {
        $this->getJson('/api/timetables')->assertOk();
    }

    public function test_view_timetable(): void
    {
        $tt = AcademicTimetable::factory()->create();
        $this->getJson("/api/timetables/{$tt->id}")->assertOk();
    }

    public function test_update_timetable(): void
    {
        $tt = AcademicTimetable::factory()->create();
        $this->putJson("/api/timetables/{$tt->id}", [
            'start_time' => '10:00', 'end_time' => '12:00',
        ])->assertOk();
    }

    public function test_delete_timetable(): void
    {
        $tt = AcademicTimetable::factory()->create();
        $this->deleteJson("/api/timetables/{$tt->id}")->assertOk();
    }

    public function test_week_grid(): void
    {
        $this->getJson('/api/timetables/week-grid')->assertOk();
    }

    public function test_staff_list(): void
    {
        $this->getJson('/api/timetables/staff-list')->assertOk();
    }

    public function test_student_timetable(): void
    {
        Sanctum::actingAs(User::factory()->student()->create());
        $this->getJson('/api/my/timetable')->assertOk();
    }

    public function test_list_lecture_rooms(): void
    {
        $this->getJson('/api/lecture-rooms')->assertOk();
    }

    public function test_create_lecture_room(): void
    {
        $this->postJson('/api/lecture-rooms', [
            'name' => 'Lab 101', 'code' => 'LAB101', 'capacity' => 30,
        ])->assertCreated();
    }

    public function test_update_lecture_room(): void
    {
        $room = LectureRoom::factory()->create();
        $this->putJson("/api/lecture-rooms/{$room->id}", [
            'name' => 'Updated Lab',
        ])->assertOk();
    }

    public function test_delete_lecture_room(): void
    {
        $room = LectureRoom::factory()->create();
        $this->deleteJson("/api/lecture-rooms/{$room->id}")->assertOk();
    }
}
