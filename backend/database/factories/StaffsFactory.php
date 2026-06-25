<?php

namespace Database\Factories;

use App\Models\staffs;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<staffs>
 */
class StaffsFactory extends Factory
{
    protected $model = staffs::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $employeeNumber = 'EMP-' . fake()->unique()->numerify('#####');

        return [
            'user_id' => User::factory(),
            'employee_number' => $employeeNumber,
            'first_name' => fake()->firstName(),
            'middle_name' => fake()->optional()->firstName(),
            'last_name' => fake()->lastName(),
            'kra_pin' => null,
            'nhif_number' => fake()->optional()->numerify('##########'),
            'nssf_number' => fake()->optional()->numerify('##########'),
            'department_id' => null,
            'job_title' => fake()->jobTitle(),
            'employment_type' => fake()->randomElement(['Permanent', 'Contract', 'Part-time', 'Casual']),
            'date_joined' => fake()->dateTimeBetween('-10 years', 'now')->format('Y-m-d'),
            'contract_end_date' => null,
            'basic_salary' => fake()->randomFloat(2, 30000, 180000),
            'highest_qualification' => fake()->randomElement(['Certificate', 'Diploma', 'Degree', 'Masters']),
            'specialization' => fake()->optional()->word(),
            'status' => true,
            'termination_date' => null,
            'termination_reason' => null,
            'created_by' => null,
            'updated_by' => null,
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'job_title' => 'System Administrator',
            'employment_type' => 'Permanent',
            'status' => true,
        ]);
    }

    public function trainer(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => User::factory()->trainer(),
            'job_title' => 'Trainer',
            'employment_type' => 'Permanent',
            'status' => true,
            'is_teaching_staff' => true,
        ]);
    }
}
