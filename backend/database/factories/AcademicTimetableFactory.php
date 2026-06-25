<?php

namespace Database\Factories;

use App\Models\AcademicSession;
use App\Models\AcademicTimetable;
use App\Models\LectureRoom;
use App\Models\staffs;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AcademicTimetable>
 */
class AcademicTimetableFactory extends Factory
{
    protected $model = AcademicTimetable::class;

    public function definition(): array
    {
        return [
            'academic_session_id' => AcademicSession::factory()->active(),
            'unit_id' => Unit::factory(),
            'trainer_staff_id' => staffs::factory()->trainer(),
            'lecture_room_id' => LectureRoom::factory(),
            'day_of_week' => fake()->numberBetween(0, 4),
            'start_time' => '08:00',
            'end_time' => '10:00',
            'type' => 'lecture',
            'recurrence' => 'weekly',
            'date' => null,
            'notes' => fake()->optional()->sentence(),
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
