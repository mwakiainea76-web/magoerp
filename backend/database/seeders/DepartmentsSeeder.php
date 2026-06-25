<?php

namespace Database\Seeders;

use App\Models\departments;
use Illuminate\Database\Seeder;

class DepartmentsSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            ['code' => 'ICT', 'name' => 'Information Communication Technology'],
            ['code' => 'HOSP', 'name' => 'Hospitality and Tourism Management'],
            ['code' => 'ENG', 'name' => 'Engineering'],
            ['code' => 'BUS', 'name' => 'Business and Management Studies'],
            ['code' => 'EDU', 'name' => 'Education and Social Sciences'],
        ];

        foreach ($departments as $dept) {
            departments::updateOrCreate(
                ['code' => $dept['code']],
                $dept
            );
        }
    }
}
