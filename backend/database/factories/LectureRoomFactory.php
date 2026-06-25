<?php

namespace Database\Factories;

use App\Models\LectureRoom;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LectureRoom>
 */
class LectureRoomFactory extends Factory
{
    protected $model = LectureRoom::class;

    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->bothify('ROOM###'));

        return [
            'name' => "{$code} Lecture Room",
            'code' => $code,
            'capacity' => fake()->numberBetween(25, 120),
            'location' => fake()->optional()->streetName(),
            'description' => fake()->optional()->sentence(),
            'is_active' => true,
        ];
    }
}
