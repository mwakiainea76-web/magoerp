<?php

namespace Database\Factories;

use App\Models\CertificationAuthority;
use App\Models\CertificationLevel;
use App\Models\Course;
use App\Models\departments;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    protected $model = Course::class;

    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->bothify('CRS###'));

        return [
            'code' => $code,
            'initials' => $code,
            'name' => "{$code} Test Course",
            'duration' => fake()->randomElement(['1 year', '2 years', '3 years']),
            'description' => fake()->optional()->sentence(),
            'is_active' => true,
            'certification_authority_id' => CertificationAuthority::factory(),
            'certification_level_id' => CertificationLevel::factory(),
            'department_id' => departments::factory(),
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
