<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\StudentMark;
use App\Models\StudentUnitRegistration;
use App\Models\staffs;
use Illuminate\Database\Seeder;

class MarksSeeder extends Seeder
{
    public function run(): void
    {
        $session = AcademicSession::where('is_active', true)->first();
        if (!$session) {
            return;
        }

        $trainer = staffs::where('is_teaching_staff', true)->first();
        if (!$trainer) {
            return;
        }

        AcademicSessionEnrolment::where('academic_session_id', $session->id)
            ->take(3)
            ->get()
            ->each(function (AcademicSessionEnrolment $enrolment) use ($trainer) {
                $registrations = StudentUnitRegistration::where('academic_session_enrolment_id', $enrolment->id)
                    ->get();

                if ($registrations->isEmpty()) {
                    return;
                }

                foreach ($registrations as $reg) {
                    $configs = [
                        ['type' => 'CAT', 'count' => 3],
                        ['type' => 'PRAC', 'count' => 2],
                    ];

                    foreach ($configs as $cfg) {
                        for ($i = 1; $i <= $cfg['count']; $i++) {
                            StudentMark::updateOrCreate(
                                [
                                    'academic_session_enrolment_id' => $enrolment->id,
                                    'unit_id' => $reg->unit_id,
                                    'assessment_type' => $cfg['type'],
                                    'assessment_number' => $i,
                                ],
                                [
                                    'score' => fake()->numberBetween(10, 100),
                                    'marks' => 100,
                                    'is_published' => $i === $cfg['count'],
                                    'recorded_by' => $trainer->user_id,
                                ]
                            );
                        }
                    }
                }
            });
    }
}
