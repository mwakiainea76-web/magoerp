<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\ExamSeries;
use Illuminate\Database\Seeder;

class ExamSeriesSeeder extends Seeder
{
    public function run(): void
    {
        $sessions = AcademicSession::query()
            ->where('is_active', true)
            ->orWhereHas('sessionEnrolments.studentMarks')
            ->orderBy('start_date', 'desc')
            ->get();

        foreach ($sessions as $session) {
            ExamSeries::firstOrCreate(
                ['name' => $session->name . ' Exams'],
                [
                    'academic_session_id' => $session->id,
                    'is_active' => true,
                ]
            );
        }
    }
}
