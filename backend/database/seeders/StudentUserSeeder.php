<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\CourseCurriculum;
use App\Models\CourseEnrolment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;

class StudentUserSeeder extends Seeder
{
    public function run(): void
    {
        $admissionNumber = 'STUDENT-001';

        $user = User::updateOrCreate(
            ['login_id' => $admissionNumber],
            [
                'email' => 'student@magoerp.test',
                'email_verified_at' => now(),
                'password' => bcrypt('password'),
                'role' => 'student',
                'status' => true,
                'first_name' => 'Demo',
                'last_name' => 'Student',
                'gender' => 'male',
                'date_of_birth' => '2001-06-15',
                'nationality' => 'Kenyan',
                'national_id' => '22334455',
                'place_of_birth' => 'Nairobi',
                'religion' => 'Christian',
                'phone_number' => '0712345680',
                'alternative_phone_number' => null,
                'address' => 'Mago Campus',
                'city' => 'Nairobi',
                'postal_code' => '00100',
                'country' => 'Kenya',
                'profile_picture' => null,
                'is_pwd' => false,
                'disability_type' => null,
                'disability_description' => null,
                'next_of_kin_last_name' => 'Student',
                'next_of_kin_first_name' => 'Parent',
                'next_of_kin_phone' => '0798765434',
                'next_of_kin_alt_phone' => null,
                'next_of_kin_email' => 'parent@magoerp.test',
                'next_of_kin_relationship' => 'Parent',
                'last_login_at' => null,
                'created_by' => null,
                'updated_by' => null,
            ]
        );

        $user->syncRoles(['student']);

        $student = Student::updateOrCreate(
            ['admission_number' => $admissionNumber],
            [
                'user_id' => $user->id,
                'status' => 'active',
            ]
        );

        $dipCourse = Course::where('code', 'DICT')->first();
        $courseCurriculum = $dipCourse
            ? CourseCurriculum::where('course_id', $dipCourse->id)->where('is_active', true)->first()
            : null;

        if ($courseCurriculum) {
            CourseEnrolment::updateOrCreate(
                ['student_id' => $student->id, 'course_curriculum_id' => $courseCurriculum->id],
                [
                    'enrolment_date' => now()->toDateString(),
                    'status' => 'enrolled',
                ]
            );
        }
    }
}
