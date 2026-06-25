<?php

namespace Database\Factories;

use App\Models\AcademicSession;
use App\Models\AcademicYear;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AcademicSession>
 */
class AcademicSessionFactory extends Factory
{
    protected $model = AcademicSession::class;

    public function definition(): array
    {
        $sequence = fake()->unique()->numberBetween(100, 999);

        return [
            'academic_year_id' => AcademicYear::factory(),
            'code' => "S{$sequence}",
            'name' => "Session {$sequence}",
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->addMonths(3)->endOfMonth()->toDateString(),
            'description' => fake()->optional()->sentence(),
            'is_active' => true,
            'created_by' => null,
            'updated_by' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['is_active' => true]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
