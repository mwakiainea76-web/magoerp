<?php

namespace Database\Seeders;

use App\Models\CourseCurriculum;
use App\Models\CurriculumTransfer;
use App\Models\Student;
use App\Models\staffs;
use Illuminate\Database\Seeder;

class CurriculumTransferSeeder extends Seeder
{
    public function run(): void
    {
        $student = Student::first();
        if (!$student) {
            return;
        }

        $mappings = CourseCurriculum::where('is_active', true)->take(2)->get();
        if ($mappings->count() < 2) {
            return;
        }

        $staff = staffs::first();

        CurriculumTransfer::updateOrCreate(
            ['student_id' => $student->id],
            [
                'from_curriculum_mapping_id' => $mappings[0]->id,
                'to_curriculum_mapping_id' => $mappings[1]->id,
                'transfer_date' => now()->toDateString(),
                'reason' => 'Student transferred to updated curriculum for better alignment with industry standards.',
                'approved_by' => $staff?->user_id,
            ]
        );
    }
}
