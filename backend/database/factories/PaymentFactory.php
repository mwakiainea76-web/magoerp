<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'amount' => fake()->randomFloat(2, 1000, 50000),
            'payment_date' => now()->toDateString(),
            'method' => fake()->randomElement(['MPESA', 'Bank Transfer', 'Cash', 'Cheque']),
            'reference' => strtoupper(fake()->bothify('PAY-##########')),
            'status' => 'completed',
            'created_by' => null,
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
