<?php

namespace Database\Factories;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class AcademicSessionEnrolmentFactory extends Factory
{
    protected $model = AcademicSessionEnrolment::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'academic_session_id' => AcademicSession::factory(),
            'year_of_study' => fake()->numberBetween(1, 3),
            'session_number' => fake()->numberBetween(1, 3),
            'module' => fake()->numberBetween(1, 9),
            'status' => 'ongoing',
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
