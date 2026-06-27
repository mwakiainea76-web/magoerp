<?php

namespace Database\Factories;

use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentFactory extends Factory
{
    protected $model = Student::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->student(),
            'admission_number' => 'STU/' . fake()->unique()->numerify('#####') . '/' . fake()->numberBetween(24, 27),
            'status' => true,
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
