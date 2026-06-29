<?php

namespace Database\Factories;

use App\Models\CourseCurriculum;
use App\Models\CurriculumTransfer;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CurriculumTransferFactory extends Factory
{
    protected $model = CurriculumTransfer::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'from_curriculum_mapping_id' => CourseCurriculum::factory(),
            'to_curriculum_mapping_id' => CourseCurriculum::factory(),
            'transfer_date' => now()->toDateString(),
            'reason' => fake()->sentence(),
            'approved_by' => User::factory(),
        ];
    }
}
