<?php

namespace Database\Factories;

use App\Models\departments;
use Illuminate\Database\Eloquent\Factories\Factory;

class DepartmentsFactory extends Factory
{
    protected $model = departments::class;

    public function definition(): array
    {
        static $i = 0;
        $departments = [
            ['code' => 'ICT', 'name' => 'Information Communication Technology'],
            ['code' => 'HOSP', 'name' => 'Hospitality and Tourism Management'],
            ['code' => 'ENG', 'name' => 'Engineering'],
            ['code' => 'BUS', 'name' => 'Business and Management Studies'],
            ['code' => 'EDU', 'name' => 'Education'],
        ];

        $dept = $departments[$i % count($departments)];
        $i++;

        return [
            'code' => $dept['code'],
            'name' => $dept['name'],
            'head_of_department' => null,
            'description' => fake()->sentence(),
        ];
    }
}
