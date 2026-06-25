<?php

namespace Database\Factories;

use App\Models\CourseCurriculum;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    protected $model = Unit::class;

    public function definition(): array
    {
        return [
            'course_curriculum_id' => CourseCurriculum::factory(),
            'code' => strtoupper(fake()->unique()->bothify('UNT###')),
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'modules_taught' => fake()->numberBetween(1, 9),
            'year_of_study' => fake()->numberBetween(1, 3),
            'session_number' => fake()->numberBetween(1, 3),
            'taught_hours' => fake()->numberBetween(40, 120),
            'credit_factor' => fake()->randomFloat(2, 0.5, 3),
            'is_active' => true,
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
