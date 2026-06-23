<?php

namespace Database\Seeders;

use App\Models\staffs;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class StaffsSeeder extends Seeder
{
    public function run(): void
    {
        $adminUser = User::where('login_id', 'admin')->first();
        if (!$adminUser) {
            return;
        }

        $sampleStaff = [
            [
                'login_id' => 'EMP/001/26',
                'email' => 'john.doe@mago.edu',
                'first_name' => 'John',
                'middle_name' => 'Michael',
                'last_name' => 'Doe',
                'gender' => 'male',
                'date_of_birth' => '1985-03-15',
                'nationality' => 'Kenyan',
                'national_id' => '12345678',
                'place_of_birth' => 'Nairobi',
                'religion' => 'Christianity',
                'phone_number' => '+254712345678',
                'alternative_phone_number' => '+254798765432',
                'address' => '123 Kenyatta Avenue',
                'city' => 'Nairobi',
                'postal_code' => '00100',
                'country' => 'Kenya',
                'department_id' => null,
                'job_title' => 'Senior Lecturer',
                'employment_type' => 'Permanent',
                'date_joined' => '2020-01-15',
                'contract_end_date' => '2030-01-14',
                'basic_salary' => 250000.00,
                'is_teaching_staff' => true,
                'kra_pin' => 'KRA001001',
                'nhif_number' => 'NHIF001001',
                'nssf_number' => 'NSSF001001',
                'highest_qualification' => 'PhD in Computer Science',
                'specialization' => 'Software Engineering',

                'is_pwd' => false,
                'disability_type' => 'N/A',
                'disability_description' => 'N/A',
                'next_of_kin_first_name' => 'Jane',
                'next_of_kin_last_name' => 'Doe',
                'next_of_kin_phone' => '+254723456789',
                'next_of_kin_alt_phone' => '+254733456789',
                'next_of_kin_email' => 'jane.doe@email.com',
                'next_of_kin_relationship' => 'Spouse',
                'role' => 'trainer',
            ],
            [
                'login_id' => 'EMP/002/26',
                'email' => 'jane.smith@mago.edu',
                'first_name' => 'Jane',
                'middle_name' => 'Anne',
                'last_name' => 'Smith',
                'gender' => 'female',
                'date_of_birth' => '1990-07-22',
                'nationality' => 'Kenyan',
                'national_id' => '87654321',
                'place_of_birth' => 'Mombasa',
                'religion' => 'Christianity',
                'phone_number' => '+254734567890',
                'alternative_phone_number' => '+254744567890',
                'address' => '456 Moi Avenue',
                'city' => 'Mombasa',
                'postal_code' => '80100',
                'country' => 'Kenya',
                'department_id' => null,
                'job_title' => 'Department Head',
                'employment_type' => 'Permanent',
                'date_joined' => '2019-06-01',
                'contract_end_date' => '2029-05-31',
                'basic_salary' => 350000.00,
                'is_teaching_staff' => false,
                'kra_pin' => 'KRA002002',
                'nhif_number' => 'NHIF002002',
                'nssf_number' => 'NSSF002002',
                'highest_qualification' => 'MBA',
                'specialization' => 'Education Management',

                'is_pwd' => false,
                'disability_type' => 'N/A',
                'disability_description' => 'N/A',
                'next_of_kin_first_name' => 'Robert',
                'next_of_kin_last_name' => 'Smith',
                'next_of_kin_phone' => '+254745678901',
                'next_of_kin_alt_phone' => '+254755678901',
                'next_of_kin_email' => 'robert.smith@email.com',
                'next_of_kin_relationship' => 'Spouse',
                'role' => 'trainer',
            ],
        ];

        foreach ($sampleStaff as $data) {
            $employeeNumber = $data['login_id'];
            unset($data['login_id']);

            $role = $data['role'];
            unset($data['role']);

            $user = User::create([
                'login_id' => $employeeNumber,
                'email' => $data['email'],
                'password' => bcrypt('password'),
                'role' => $role,
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'],
                'last_name' => $data['last_name'],
                'gender' => $data['gender'],
                'date_of_birth' => $data['date_of_birth'],
                'nationality' => $data['nationality'],
                'national_id' => $data['national_id'],
                'place_of_birth' => $data['place_of_birth'],
                'religion' => $data['religion'],
                'phone_number' => $data['phone_number'],
                'alternative_phone_number' => $data['alternative_phone_number'],
                'address' => $data['address'],
                'city' => $data['city'],
                'postal_code' => $data['postal_code'],
                'country' => $data['country'],
                'is_pwd' => $data['is_pwd'],
                'disability_type' => $data['disability_type'],
                'disability_description' => $data['disability_description'],
                'next_of_kin_first_name' => $data['next_of_kin_first_name'],
                'next_of_kin_last_name' => $data['next_of_kin_last_name'],
                'next_of_kin_phone' => $data['next_of_kin_phone'],
                'next_of_kin_alt_phone' => $data['next_of_kin_alt_phone'],
                'next_of_kin_email' => $data['next_of_kin_email'],
                'next_of_kin_relationship' => $data['next_of_kin_relationship'],
                'created_by' => $adminUser->id,
                'updated_by' => $adminUser->id,
            ]);

            $user->assignRole($role);

            $departmentId = $data['department_id'];

            staffs::create([
                'user_id' => $user->id,
                'employee_number' => $employeeNumber,
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'],
                'last_name' => $data['last_name'],
                'kra_pin' => $data['kra_pin'],
                'nhif_number' => $data['nhif_number'],
                'nssf_number' => $data['nssf_number'],
                'department_id' => $departmentId,
                'job_title' => $data['job_title'],
                'employment_type' => $data['employment_type'],
                'date_joined' => $data['date_joined'],
                'contract_end_date' => $data['contract_end_date'],
                'basic_salary' => $data['basic_salary'],
                'is_teaching_staff' => $data['is_teaching_staff'],
                'highest_qualification' => $data['highest_qualification'],
                'specialization' => $data['specialization'],

                'status' => true,
                'created_by' => $adminUser->id,
                'updated_by' => $adminUser->id,
            ]);
        }
    }
}
