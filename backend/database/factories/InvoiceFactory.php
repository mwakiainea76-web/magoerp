<?php

namespace Database\Factories;

use App\Models\AcademicSession;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        $amount = fake()->randomFloat(2, 10000, 100000);

        return [
            'invoice_number' => 'INV-' . now()->format('Ymd') . '-' . strtoupper(fake()->bothify('??????')),
            'student_id' => Student::factory(),
            'academic_session_id' => AcademicSession::factory(),
            'invoice_type' => 'fees',
            'status' => 'issued',
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'amount_due' => $amount,
            'idempotency_key' => fake()->uuid(),
            'notes' => fake()->optional()->sentence(),
            'created_by' => null,
        ];
    }
}
