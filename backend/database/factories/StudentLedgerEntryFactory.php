<?php

namespace Database\Factories;

use App\Models\AcademicSession;
use App\Models\Invoice;
use App\Models\StudentLedgerEntry;
use App\Models\Payment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentLedgerEntryFactory extends Factory
{
    protected $model = StudentLedgerEntry::class;

    public function definition(): array
    {
        $isDebit = fake()->boolean();

        return [
            'student_id' => Student::factory(),
            'invoice_id' => Invoice::factory(),
            'payment_id' => $isDebit ? null : Payment::factory(),
            'adjustment_id' => null,
            'academic_session_id' => AcademicSession::factory(),
            'type' => $isDebit ? 'debit' : 'credit',
            'debit' => $isDebit ? fake()->randomFloat(2, 1000, 50000) : 0,
            'credit' => $isDebit ? 0 : fake()->randomFloat(2, 1000, 50000),
            'reference' => fake()->optional()->bothify('TXN-##########'),
            'description' => fake()->sentence(),
            'transaction_date' => now()->toDateString(),
            'created_by' => null,
        ];
    }
}
