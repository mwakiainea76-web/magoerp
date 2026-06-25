<?php

namespace Database\Seeders;

use App\Models\staffs;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TestDatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);
        $this->call(DepartmentsSeeder::class);
        $this->call(CertificationSeeder::class);
        $this->call(AcademicSeeder::class);
        $this->call(FinanceSeeder::class);
        $this->call(HostelSeeder::class);
        $this->call(LectureRoomSeeder::class);
        $this->call(UserSeeder::class);

        $adminUser = User::updateOrCreate(
            ['login_id' => 'EMP-ADMIN-001'],
            [
                'email' => 'admin@magoerp.test',
                'email_verified_at' => now(),
                'password' => 'Admin@12345',
                'role' => 'admin',
                'status' => true,
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'gender' => 'male',
                'date_of_birth' => '1990-01-15',
                'nationality' => 'Kenyan',
                'national_id' => '12345678',
                'phone_number' => '0712345678',
                'country' => 'Kenya',
            ]
        );

        $adminUser->syncRoles(['admin']);

        staffs::updateOrCreate(
            ['user_id' => $adminUser->id],
            [
                'employee_number' => 'EMP-ADMIN-001',
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'job_title' => 'System Administrator',
                'employment_type' => 'Permanent',
                'date_joined' => '2024-01-01',
                'basic_salary' => 120000,
                'is_teaching_staff' => false,
                'highest_qualification' => 'Degree',
                'specialization' => 'ICT Administration',
                'status' => true,
            ]
        );
    }
}
