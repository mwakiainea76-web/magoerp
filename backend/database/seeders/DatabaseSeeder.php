<?php

namespace Database\Seeders;

use App\Models\staffs;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        $loginId = 'EMP-ADMIN-001';

        $adminUser = User::updateOrCreate(
            ['login_id' => $loginId],
            [
                'email' => 'admin@magoerp.test',
                'email_verified_at' => now(),
                'password' => bcrypt('password'),
                'role' => 'admin',
                'status' => true,
                'first_name' => 'System',
                'middle_name' => null,
                'last_name' => 'Administrator',
                'gender' => 'male',
                'date_of_birth' => '1990-01-15',
                'nationality' => 'Kenyan',
                'national_id' => '12345678',
                'place_of_birth' => 'Nairobi',
                'religion' => 'Christian',
                'phone_number' => '0712345678',
                'alternative_phone_number' => null,
                'address' => 'Mago Campus',
                'city' => 'Nairobi',
                'postal_code' => '00100',
                'country' => 'Kenya',
                'profile_picture' => null,
                'is_pwd' => false,
                'disability_type' => null,
                'disability_description' => null,
                'next_of_kin_last_name' => 'Admin',
                'next_of_kin_first_name' => 'Support',
                'next_of_kin_phone' => '0798765432',
                'next_of_kin_alt_phone' => null,
                'next_of_kin_email' => 'support@magoerp.test',
                'next_of_kin_relationship' => 'Colleague',
                'last_login_at' => null,
                'created_by' => null,
                'updated_by' => null,
            ]
        );

        $adminUser->syncRoles(['admin']);

        $adminStaff = staffs::updateOrCreate(
            ['user_id' => $adminUser->id],
            [
                'employee_number' => $loginId,
                'kra_pin' => null,
                'nhif_number' => null,
                'nssf_number' => null,
                'department_id' => null,
                'job_title' => 'System Administrator',
                'employment_type' => 'Permanent',
                'date_joined' => '2024-01-01',
                'confirmation_date' => '2024-04-01',
                'contract_end_date' => null,
                'basic_salary' => 120000,
                'is_teaching_staff' => false,
                'highest_qualification' => 'Degree',
                'specialization' => 'ICT Administration',
                'status' => true,
                'termination_date' => null,
                'termination_reason' => null,
            ]
        );

        $this->call([
            DepartmentsSeeder::class,
            CertificationSeeder::class,
            AcademicSeeder::class,
            FinanceSeeder::class,
            HostelSeeder::class,
            LectureRoomSeeder::class,
            UserSeeder::class,
            TimetableFeatureSeeder::class,
            SystemConfigurationSeeder::class,
            StudentAccountSeeder::class,
            HostelAllocationSeeder::class,
            MarksSeeder::class,
            ComplaintsSeeder::class,
            CurriculumTransferSeeder::class,
        ]);
    }
}
