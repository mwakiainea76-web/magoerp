<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\AcademicTimetable;
use App\Models\AcademicYear;
use App\Models\CertificationAuthority;
use App\Models\CertificationLevel;
use App\Models\Course;
use App\Models\CourseCurriculum;
use App\Models\Curriculum;
use App\Models\departments;
use App\Models\LectureRoom;
use App\Models\Student;
use App\Models\StudentUnitRegistration;
use App\Models\staffs;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;

class TimetableFeatureSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('login_id', 'EMP-ADMIN-001')->first();
        $adminStaff = $admin ? staffs::where('user_id', $admin->id)->first() : null;

        $department = departments::updateOrCreate(
            ['code' => 'ICT'],
            [
                'name' => 'Information Communication Technology',
                'description' => 'ICT training department.',
                'updated_by' => $adminStaff?->id,
            ],
        );

        $authority = CertificationAuthority::updateOrCreate(
            ['code' => 'TVETA'],
            [
                'name' => 'Technical and Vocational Education and Training Authority',
                'description' => 'Test certification authority.',
                'is_active' => true,
                'updated_by' => $adminStaff?->id,
            ],
        );

        $level = CertificationLevel::updateOrCreate(
            ['certification_authority_id' => $authority->id, 'code' => 'L4'],
            [
                'name' => 'Level 4',
                'entry_grade' => 'D',
                'description' => 'Test level for timetable setup.',
                'is_active' => true,
                'updated_by' => $adminStaff?->id,
            ],
        );

        $curriculum = Curriculum::updateOrCreate(
            ['code' => 'TT-CYC1'],
            [
                'certification_authority_id' => $authority->id,
                'name' => 'Timetable Test Cycle 1',
                'description' => 'Active curriculum for timetable tests.',
                'is_active' => true,
                'updated_by' => $adminStaff?->id,
            ],
        );

        $course = Course::updateOrCreate(
            ['code' => 'TT-ICT4'],
            [
                'initials' => 'TTICT4',
                'name' => 'Timetable Test ICT Level 4',
                'duration_months' => 12,
                'description' => 'Course used for timetable create testing.',
                'is_active' => true,
                'certification_authority_id' => $authority->id,
                'certification_level_id' => $level->id,
                'department_id' => $department->id,
                'updated_by' => $adminStaff?->id,
            ],
        );

        $courseCurriculum = CourseCurriculum::updateOrCreate(
            ['course_id' => $course->id, 'curriculum_id' => $curriculum->id],
            ['is_active' => true],
        );

        $units = [
            ['code' => 'TTICT4-101', 'name' => 'Computer Software Installation', 'modules_taught' => 1],
            ['code' => 'TTICT4-102', 'name' => 'Computer Hardware Maintenance', 'modules_taught' => 2],
            ['code' => 'TTICT4-103', 'name' => 'Office Productivity Tools', 'modules_taught' => 3],
        ];

        foreach ($units as $unit) {
            Unit::updateOrCreate(
                ['course_curriculum_id' => $courseCurriculum->id, 'code' => $unit['code']],
                [
                    'name' => $unit['name'],
                    'description' => 'Timetable test unit.',
                    'modules_taught' => $unit['modules_taught'],
                    'year_of_study' => 1,
                    'session_number' => $unit['modules_taught'],
                    'taught_hours' => 80,
                    'credit_factor' => 1,
                    'is_active' => true,
                    'updated_by' => $adminStaff?->id,
                ],
            );
        }

        $year = AcademicYear::where('is_active', true)->first()
            ?? AcademicYear::updateOrCreate(
                ['code' => 'TT-2026'],
                [
                    'name' => 'Timetable Test Academic Year 2026',
                    'start_date' => '2026-01-01',
                    'end_date' => '2026-12-31',
                    'description' => 'Academic year for timetable tests.',
                    'is_active' => true,
                    'updated_by' => $adminStaff?->id,
                ],
            );

        $activeSession = AcademicSession::where('is_active', true)->first()
            ?? AcademicSession::updateOrCreate(
                ['academic_year_id' => $year->id, 'code' => 'TT-2026-S1'],
                [
                    'name' => 'Timetable Test Session 1',
                    'start_date' => '2026-01-01',
                    'end_date' => '2026-06-30',
                    'description' => 'Active session for timetable creation.',
                    'is_active' => true,
                    'updated_by' => $adminStaff?->id,
                ],
            );

        AcademicSession::updateOrCreate(
            ['academic_year_id' => $year->id, 'code' => 'TT-2026-S0'],
            [
                'name' => 'Timetable Test Inactive Session',
                'start_date' => '2025-07-01',
                'end_date' => '2025-12-31',
                'description' => 'Inactive session for negative tests.',
                'is_active' => false,
                'updated_by' => $adminStaff?->id,
            ],
        );

        $trainerUser = User::updateOrCreate(
            ['login_id' => 'EMP-TT-TRAINER'],
            [
                'email' => 'timetable.trainer@magoerp.test',
                'password' => bcrypt('password'),
                'role' => 'trainer',
                'status' => true,
                'first_name' => 'Timetable',
                'middle_name' => null,
                'last_name' => 'Trainer',
                'gender' => 'male',
                'date_of_birth' => '1992-04-12',
                'nationality' => 'Kenyan',
                'national_id' => 'TT123456',
                'place_of_birth' => 'Nairobi',
                'religion' => 'Christian',
                'phone_number' => '0700000101',
                'alternative_phone_number' => null,
                'county' => 'Nairobi',
                'is_pwd' => false,
                'disability_type' => null,
                'disability_description' => null,
                'next_of_kin_first_name' => 'Test',
                'next_of_kin_last_name' => 'Contact',
                'next_of_kin_phone' => '0700000102',
                'next_of_kin_alt_phone' => null,
                'next_of_kin_email' => 'timetable.contact@magoerp.test',
                'next_of_kin_relationship' => 'Guardian',
                'updated_by' => $adminStaff?->id,
            ],
        );
        $trainerUser->syncRoles(['trainer']);

        $trainer = staffs::updateOrCreate(
            ['user_id' => $trainerUser->id],
            [
                'employee_number' => 'EMP-TT-TRAINER',
                'kra_pin' => 'TTKRA001',
                'nhif_number' => 'TTNHIF001',
                'nssf_number' => 'TTNSSF001',
                'department_id' => $department->id,
                'job_title' => 'ICT Trainer',
                'employment_type' => 'Permanent',
                'date_joined' => '2026-01-01',
                'contract_end_date' => null,
                'basic_salary' => 80000,
                'highest_qualification' => 'Degree',
                'specialization' => 'ICT',
                'status' => true,
                'created_by' => $adminStaff?->id,
                'updated_by' => $adminStaff?->id,
            ],
        );

        $room = LectureRoom::updateOrCreate(
            ['code' => 'TT-LAB-1'],
            [
                'name' => 'Timetable Test Lab 1',
                'capacity' => 40,
                'location' => 'ICT Block',
                'description' => 'Active room for timetable tests.',
                'is_active' => true,
            ],
        );

        $firstUnit = Unit::where('course_curriculum_id', $courseCurriculum->id)
            ->where('code', 'TTICT4-101')
            ->first();

        Student::whereIn('admission_number', ['STU/001/26', 'STU/002/26', 'STU/003/26'])
            ->get()
            ->each(function (Student $student) use ($activeSession, $firstUnit, $adminStaff) {
                if (!$firstUnit) {
                    return;
                }

                $sessionEnrolment = AcademicSessionEnrolment::updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'academic_session_id' => $activeSession->id,
                    ],
                    [
                        'year_of_study' => 1,
                        'session_number' => 1,
                        'module' => 1,
                        'status' => 'enrolled',
                        'created_by' => $adminStaff?->id,
                        'updated_by' => $adminStaff?->id,
                    ],
                );

                StudentUnitRegistration::updateOrCreate(
                    [
                        'academic_session_enrolment_id' => $sessionEnrolment->id,
                        'unit_id' => $firstUnit->id,
                    ],
                    []
                );
            });

        AcademicTimetable::updateOrCreate(
            [
                'academic_session_id' => $activeSession->id,
                'unit_id' => $firstUnit?->id,
                'day_of_week' => 0,
                'start_time' => '08:00',
            ],
            [
                'trainer_staff_id' => $trainer->id,
                'lecture_room_id' => $room->id,
                'end_time' => '10:00',
                'type' => 'lecture',
                'recurrence' => 'weekly',
                'date' => null,
                'notes' => 'Seeded timetable entry for testing.',
                'created_by' => $adminStaff?->id,
                'updated_by' => $adminStaff?->id,
            ],
        );
    }
}
