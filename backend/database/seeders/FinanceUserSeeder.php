<?php

namespace Database\Seeders;

use App\Models\staffs;
use App\Models\User;
use Illuminate\Database\Seeder;

class FinanceUserSeeder extends Seeder
{
    public function run(): void
    {
        $loginId = 'FINANCE-001';

        $user = User::updateOrCreate(
            ['login_id' => $loginId],
            [
                'email' => 'finance@magoerp.test',
                'email_verified_at' => now(),
                'password' => bcrypt('password'),
                'role' => 'finance',
                'status' => true,
                'first_name' => 'Finance',
                'last_name' => 'Officer',
                'gender' => 'female',
                'date_of_birth' => '1992-03-15',
                'nationality' => 'Kenyan',
                'national_id' => '87654322',
                'place_of_birth' => 'Nairobi',
                'religion' => 'Christian',
                'phone_number' => '0712345679',
                'alternative_phone_number' => null,
                'address' => 'Mago Campus',
                'city' => 'Nairobi',
                'postal_code' => '00100',
                'country' => 'Kenya',
                'profile_picture' => null,
                'is_pwd' => false,
                'disability_type' => null,
                'disability_description' => null,
                'next_of_kin_last_name' => 'Finance',
                'next_of_kin_first_name' => 'Support',
                'next_of_kin_phone' => '0798765433',
                'next_of_kin_alt_phone' => null,
                'next_of_kin_email' => 'finance.next@magoerp.test',
                'next_of_kin_relationship' => 'Colleague',
                'last_login_at' => null,
                'created_by' => null,
                'updated_by' => null,
            ]
        );

        $user->syncRoles(['finance']);

        staffs::updateOrCreate(
            ['user_id' => $user->id],
            [
                'employee_number' => $loginId,
                'kra_pin' => null,
                'nhif_number' => null,
                'nssf_number' => null,
                'department_id' => null,
                'job_title' => 'Finance Officer',
                'employment_type' => 'Permanent',
                'date_joined' => '2024-01-01',
                'confirmation_date' => '2024-04-01',
                'contract_end_date' => null,
                'basic_salary' => 100000,
                'is_teaching_staff' => false,
                'highest_qualification' => 'Degree',
                'specialization' => 'Finance',
                'status' => true,
                'termination_date' => null,
                'termination_reason' => null,
            ]
        );
    }
}
