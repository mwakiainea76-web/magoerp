<?php

namespace Database\Factories;

use App\Models\departments;
use Illuminate\Database\Eloquent\Factories\Factory;

class DepartmentsFactory extends Factory
{
    protected $model = departments::class;

    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->bothify('DEPT###'));

        return [
            'code' => $code,
            'name' => "{$code} Department",
            'head_of_department' => null,
            'description' => fake()->sentence(),
        ];
    }
}
