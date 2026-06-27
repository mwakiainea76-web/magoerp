<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\CourseCurriculum;
use App\Models\CourseEnrolment;
use App\Models\departments;
use App\Models\Student;
use App\Models\staffs;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $ictDept = departments::where('code', 'ICT')->first();
        $dipCourse = Course::where('code', 'DICT')->first();

        $trainer = User::updateOrCreate(
            ['login_id' => 'TRAINER-001'],
            [
                'email' => 'trainer@magoerp.test',
                'password' => bcrypt('password'),
                'role' => 'trainer',
                'status' => true,
                'first_name' => 'James',
                'last_name' => 'Trainer',
                'gender' => 'male',
                'date_of_birth' => '1988-05-20',
                'nationality' => 'Kenyan',
                'national_id' => '87654321',
                'phone_number' => '0722000111',
                'address' => 'Mago Campus',
                'city' => 'Nairobi',
                'country' => 'Kenya',
            ]
        );
        $trainer->syncRoles(['trainer']);

        staffs::updateOrCreate(
            ['user_id' => $trainer->id],
            [
                'employee_number' => 'TRAINER-001',
                'department_id' => $ictDept?->id,
                'job_title' => 'ICT Lecturer',
                'employment_type' => 'Permanent',
                'date_joined' => '2024-01-15',
                'basic_salary' => 80000,
                'is_teaching_staff' => true,
                'highest_qualification' => 'Degree',
                'specialization' => 'ICT',
                'status' => true,
            ]
        );

        $students = [
            ['adm' => 'STU/001/26', 'first' => 'Alice', 'last' => 'Mwangi'],
            ['adm' => 'STU/002/26', 'first' => 'Brian', 'last' => 'Kiprop'],
            ['adm' => 'STU/003/26', 'first' => 'Catherine', 'last' => 'Wanjiku'],
        ];

        foreach ($students as $s) {
            $user = User::updateOrCreate(
                ['login_id' => $s['adm']],
                [
                    'email' => strtolower($s['first']) . '@magoerp.test',
                    'password' => bcrypt('password'),
                    'role' => 'student',
                    'status' => true,
                    'first_name' => $s['first'],
                    'last_name' => $s['last'],
                    'gender' => 'male',
                    'date_of_birth' => '2002-01-01',
                    'nationality' => 'Kenyan',
                    'national_id' => '3' . str_pad((string) rand(0, 99999999), 8, '0', STR_PAD_LEFT),
                    'phone_number' => '07' . rand(10000000, 99999999),
                    'country' => 'Kenya',
                ]
            );
            $user->syncRoles(['student']);

            $courseCurriculum = $dipCourse
                ? CourseCurriculum::where('course_id', $dipCourse->id)->where('is_active', true)->first()
                : null;

            $student = Student::updateOrCreate(
                ['admission_number' => $s['adm']],
                [
                    'user_id' => $user->id,
                    'status' => true,
                ]
            );

            CourseEnrolment::updateOrCreate(
                ['student_id' => $student->id, 'course_curriculum_id' => $courseCurriculum?->id],
                [
                    'enrolment_date' => now()->toDateString(),
                    'status' => 'enrolled',
                ]
            );
        }
    }
}
