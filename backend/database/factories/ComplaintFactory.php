<?php

namespace Database\Factories;

use App\Models\Complaint;
use App\Models\Staffs;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class ComplaintFactory extends Factory
{
    protected $model = Complaint::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'subject' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status' => 'pending',
            'escalated_to' => null,
            'escalated_at' => null,
            'admin_notes' => null,
            'resolved_at' => null,
        ];
    }

    public function escalated(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'escalated',
            'escalated_to' => staffs::factory(),
            'escalated_at' => now(),
        ]);
    }

    public function resolved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'resolved',
            'admin_notes' => fake()->sentence(),
            'resolved_at' => now(),
        ]);
    }
}
