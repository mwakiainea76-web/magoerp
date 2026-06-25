<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AcademicYear>
 */
class AcademicYearFactory extends Factory
{
    protected $model = AcademicYear::class;

    public function definition(): array
    {
        $startYear = fake()->unique()->numberBetween(2020, 2040);
        $endYear = $startYear + 1;

        return [
            'code' => "{$startYear}-{$endYear}",
            'name' => "Academic Year {$startYear}/{$endYear}",
            'start_date' => "{$startYear}-09-01",
            'end_date' => "{$endYear}-08-31",
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
