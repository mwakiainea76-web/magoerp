<?php

namespace Database\Factories;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\staffs;
use App\Models\Student;
use App\Models\StudentMark;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentMarkFactory extends Factory
{
    protected $model = StudentMark::class;

    public function definition(): array
    {
        return [
            'academic_session_id' => AcademicSession::factory(),
            'academic_session_enrolment_id' => AcademicSessionEnrolment::factory(),
            'student_id' => Student::factory(),
            'unit_id' => Unit::factory(),
            'assessment_type' => fake()->randomElement(['CAT', 'PRAC']),
            'assessment_number' => fake()->numberBetween(1, 3),
            'score' => fake()->numberBetween(10, 100),
            'marks' => 100,
            'is_published' => false,
            'recorded_by_staff_id' => staffs::factory(),
        ];
    }
}
