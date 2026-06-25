<?php

namespace Database\Factories;

use App\Models\CertificationAuthority;
use App\Models\Curriculum;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Curriculum>
 */
class CurriculumFactory extends Factory
{
    protected $model = Curriculum::class;

    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->bothify('CUR###'));

        return [
            'certification_authority_id' => CertificationAuthority::factory(),
            'code' => $code,
            'name' => "{$code} Curriculum",
            'description' => fake()->optional()->sentence(),
            'is_active' => true,
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
