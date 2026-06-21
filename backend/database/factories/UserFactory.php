<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    protected static ?string $password;

    public function configure(): static
    {
        return $this->afterCreating(function (User $user) {
            $role = $user->role ?? 'student';

            if (! $user->hasRole($role)) {
                $user->assignRole($role);
            }
        });
    }

    public function definition(): array
    {
        $firstName = fake()->firstName();
        $lastName = fake()->lastName();

        return [
            'login_id' => 'LGN-' . fake()->unique()->numerify('#####'),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password123'),
            'remember_token' => Str::random(10),
            'role' => 'student',
            'status' => true,
            'first_name' => $firstName,
            'middle_name' => fake()->optional()->firstName(),
            'last_name' => $lastName,
            'gender' => fake()->randomElement(['male', 'female', 'other']),
            'date_of_birth' => fake()->dateTimeBetween('-40 years', '-18 years')->format('Y-m-d'),
            'nationality' => 'Kenyan',
            'national_id' => fake()->unique()->numerify('########'),
            'place_of_birth' => fake()->city(),
            'religion' => fake()->optional()->randomElement(['Christian', 'Muslim', 'Hindu', 'Other']),
            'phone_number' => '07' . fake()->unique()->numerify('########'),
            'alternative_phone_number' => fake()->optional()->numerify('07########'),
            'address' => fake()->optional()->streetAddress(),
            'city' => fake()->city(),
            'postal_code' => fake()->postcode(),
            'country' => 'Kenya',
            'profile_picture' => null,
            'is_pwd' => false,
            'disability_type' => null,
            'disability_description' => null,
            'next_of_kin_last_name' => fake()->lastName(),
            'next_of_kin_first_name' => fake()->firstName(),
            'next_of_kin_phone' => '07' . fake()->numerify('########'),
            'next_of_kin_alt_phone' => fake()->optional()->numerify('07########'),
            'next_of_kin_email' => fake()->optional()->safeEmail(),
            'next_of_kin_relationship' => fake()->randomElement(['Parent', 'Sibling', 'Spouse', 'Guardian']),
            'last_login_at' => null,
            'created_by' => null,
            'updated_by' => null,
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
            'status' => true,
        ]);
    }

    public function trainer(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'trainer',
            'status' => true,
        ]);
    }

    public function student(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'student',
            'status' => true,
        ]);
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
