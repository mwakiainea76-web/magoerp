<?php

namespace Database\Factories;

use App\Models\CertificationAuthority;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CertificationAuthority>
 */
class CertificationAuthorityFactory extends Factory
{
    protected $model = CertificationAuthority::class;

    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->bothify('AUTH###'));

        return [
            'code' => $code,
            'name' => "{$code} Certification Authority",
            'description' => fake()->optional()->sentence(),
            'is_active' => true,
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
