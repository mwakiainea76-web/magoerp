<?php

namespace Database\Factories;

use App\Models\CertificationAuthority;
use App\Models\CertificationLevel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CertificationLevel>
 */
class CertificationLevelFactory extends Factory
{
    protected $model = CertificationLevel::class;

    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->bothify('LVL###'));

        return [
            'certification_authority_id' => CertificationAuthority::factory(),
            'code' => $code,
            'name' => "{$code} Level",
            'entry_grade' => fake()->randomElement(['D', 'D+', 'C-', 'C', 'C+']),
            'description' => fake()->optional()->sentence(),
            'is_active' => true,
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
