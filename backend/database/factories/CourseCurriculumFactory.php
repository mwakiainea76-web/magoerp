<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\CourseCurriculum;
use App\Models\Curriculum;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CourseCurriculum>
 */
class CourseCurriculumFactory extends Factory
{
    protected $model = CourseCurriculum::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'curriculum_id' => Curriculum::factory(),
            'is_active' => true,
        ];
    }
}
