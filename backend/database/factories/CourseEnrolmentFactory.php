<?php

namespace Database\Factories;

use App\Models\AcademicSession;
use App\Models\CourseCurriculum;
use App\Models\CourseEnrolment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class CourseEnrolmentFactory extends Factory
{
    protected $model = CourseEnrolment::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'course_curriculum_id' => CourseCurriculum::factory(),
            'academic_session_id' => AcademicSession::factory(),
            'enrolment_date' => now()->toDateString(),
            'status' => 'enrolled',
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
