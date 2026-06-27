<?php

namespace Database\Factories;

use App\Models\CourseEnrolment;
use App\Models\Student;
use App\Models\StudentStatusLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentStatusLogFactory extends Factory
{
    protected $model = StudentStatusLog::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'course_enrolment_id' => CourseEnrolment::factory(),
            'from_status' => 'enrolled',
            'to_status' => fake()->randomElement(['suspended', 'withdrawn', 'graduated', 'deferred']),
            'reason' => fake()->sentence(),
            'effective_date' => now()->toDateString(),
            'recorded_by' => User::factory(),
        ];
    }
}
