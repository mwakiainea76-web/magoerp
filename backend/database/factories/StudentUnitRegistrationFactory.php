<?php

namespace Database\Factories;

use App\Models\AcademicSessionEnrolment;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentUnitRegistrationFactory extends Factory
{
    protected $model = StudentUnitRegistration::class;

    public function definition(): array
    {
        return [
            'academic_session_enrolment_id' => AcademicSessionEnrolment::factory(),
            'unit_id' => Unit::factory(),
        ];
    }
}
