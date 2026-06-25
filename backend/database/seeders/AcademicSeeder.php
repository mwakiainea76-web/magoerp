<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\AcademicSession;
use Illuminate\Database\Seeder;

class AcademicSeeder extends Seeder
{
    public function run(): void
    {
        $year = AcademicYear::updateOrCreate(
            ['code' => '2025-2026'],
            [
                'name' => 'Academic Year 2025/2026',
                'start_date' => '2025-09-01',
                'end_date' => '2026-08-31',
                'is_active' => true,
            ]
        );

        $sessions = [
            ['code' => '2025-S1', 'name' => 'Semester 1 2025/2026', 'start_date' => '2025-09-01', 'end_date' => '2025-12-20'],
            ['code' => '2025-S2', 'name' => 'Semester 2 2025/2026', 'start_date' => '2026-01-10', 'end_date' => '2026-04-30'],
        ];

        foreach ($sessions as $s) {
            AcademicSession::updateOrCreate(
                ['code' => $s['code']],
                [
                    'academic_year_id' => $year->id,
                    'name' => $s['name'],
                    'start_date' => $s['start_date'],
                    'end_date' => $s['end_date'],
                    'is_active' => $s['code'] === '2025-S1',
                ]
            );
        }
    }
}
