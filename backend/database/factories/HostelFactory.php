<?php

namespace Database\Factories;

use App\Models\Hostel;
use Illuminate\Database\Eloquent\Factories\Factory;

class HostelFactory extends Factory
{
    protected $model = Hostel::class;

    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->bothify('HST###'));

        return [
            'name' => fake()->words(2, true) . ' Hostel',
            'code' => $code,
            'session_fee_amount' => fake()->randomFloat(2, 8000, 25000),
            'gender' => fake()->randomElement(['male', 'female']),
            'location' => 'Main Campus',
            'description' => fake()->optional()->sentence(),
            'is_active' => true,
        ];
    }
}
