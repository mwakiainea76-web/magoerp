<?php

namespace Database\Seeders;

use App\Models\CertificationAuthority;
use App\Models\CertificationLevel;
use App\Models\Curriculum;
use App\Models\Course;
use App\Models\CourseCurriculum;
use App\Models\departments;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class CertificationSeeder extends Seeder
{
    public function run(): void
    {
        $authority = CertificationAuthority::updateOrCreate(
            ['code' => 'KNEC'],
            ['name' => 'Kenya National Examination Council', 'is_active' => true]
        );

        $levels = [
            ['code' => 'ART', 'name' => 'Artisan', 'entry_grade' => 'D-'],
            ['code' => 'CRT', 'name' => 'Certificate', 'entry_grade' => 'D+'],
            ['code' => 'DIP', 'name' => 'Diploma', 'entry_grade' => 'C-'],
            ['code' => 'HDIP', 'name' => 'Higher Diploma', 'entry_grade' => 'Diploma'],
        ];

        foreach ($levels as $level) {
            CertificationLevel::updateOrCreate(
                ['code' => $level['code'], 'certification_authority_id' => $authority->id],
                [
                    'name' => $level['name'],
                    'entry_grade' => $level['entry_grade'],
                    'is_active' => true,
                ]
            );
        }

        $curricula = [
            ['code' => '2024', 'name' => 'CBT Curriculum 2024'],
            ['code' => '2025', 'name' => 'CBT Curriculum 2025'],
        ];

        $diplomaLevel = CertificationLevel::where('code', 'DIP')->first();
        $certLevel = CertificationLevel::where('code', 'CRT')->first();
        $ictDept = departments::where('code', 'ICT')->first();
        $busDept = departments::where('code', 'BUS')->first();

        foreach ($curricula as $c) {
            Curriculum::updateOrCreate(
                ['code' => $c['code'], 'certification_authority_id' => $authority->id],
                ['name' => $c['name'], 'is_active' => true]
            );
        }

        $ictDiploma2024 = Curriculum::where('code', '2024')->first();

        $courses = [
            ['code' => 'DICT', 'initials' => 'DICT', 'name' => 'Diploma in Information Communication Technology', 'duration_months' => 36, 'level_id' => $diplomaLevel->id, 'dept_id' => $ictDept->id],
            ['code' => 'DBM', 'initials' => 'DBM', 'name' => 'Diploma in Business Management', 'duration_months' => 36, 'level_id' => $diplomaLevel->id, 'dept_id' => $busDept->id],
            ['code' => 'CICT', 'initials' => 'CICT', 'name' => 'Certificate in Information Communication Technology', 'duration_months' => 24, 'level_id' => $certLevel->id, 'dept_id' => $ictDept->id],
        ];

        $courseIds = [];
        foreach ($courses as $c) {
            $course = Course::updateOrCreate(
                ['code' => $c['code']],
                [
                    'initials' => $c['initials'],
                    'name' => $c['name'],
                    'duration_months' => $c['duration_months'],
                    'certification_authority_id' => $authority->id,
                    'certification_level_id' => $c['level_id'],
                    'department_id' => $c['dept_id'],
                    'is_active' => true,
                ]
            );
            $courseIds[] = $course->id;
        }

        if ($ictDiploma2024) {
            foreach ($courseIds as $cid) {
                CourseCurriculum::updateOrCreate(
                    ['course_id' => $cid, 'curriculum_id' => $ictDiploma2024->id],
                    ['is_active' => true]
                );
            }
        }

        $dipCourse = Course::where('code', 'DICT')->first();
        $cc = CourseCurriculum::where('course_id', $dipCourse->id)->where('curriculum_id', $ictDiploma2024->id)->first();

        if ($cc) {
            $units = [
                ['code' => 'ICT101', 'name' => 'Introduction to ICT'],
                ['code' => 'ICT102', 'name' => 'Computer Applications'],
                ['code' => 'ICT103', 'name' => 'Internet Technologies'],
                ['code' => 'ICT201', 'name' => 'Programming Fundamentals'],
                ['code' => 'ICT202', 'name' => 'Database Systems'],
                ['code' => 'ICT203', 'name' => 'Systems Analysis and Design'],
            ];

            foreach ($units as $u) {
                Unit::updateOrCreate(
                    ['code' => $u['code'], 'course_curriculum_id' => $cc->id],
                    [
                        'name' => $u['name'],
                        'taught_hours' => 80,
                        'credit_factor' => 1,
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
