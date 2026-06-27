<?php

namespace Database\Factories;

use App\Models\CourseChangeLog;
use App\Models\CourseCurriculum;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CourseChangeLogFactory extends Factory
{
    protected $model = CourseChangeLog::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'old_admission_number' => fake()->regexify('[A-Z]{4}/\d{3}/\d{2}'),
            'new_admission_number' => fake()->regexify('[A-Z]{4}/\d{3}/\d{2}'),
            'old_course_curriculum_id' => CourseCurriculum::factory(),
            'new_course_curriculum_id' => CourseCurriculum::factory(),
            'old_status' => 'enrolled',
            'new_status' => 'transferred',
            'processed_by' => User::factory(),
            'changed_at' => fake()->dateTimeThisYear(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
