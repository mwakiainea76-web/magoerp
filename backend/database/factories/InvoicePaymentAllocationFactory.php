<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\InvoicePaymentAllocation;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoicePaymentAllocationFactory extends Factory
{
    protected $model = InvoicePaymentAllocation::class;

    public function definition(): array
    {
        return [
            'payment_id' => Payment::factory(),
            'invoice_id' => Invoice::factory(),
            'amount' => fake()->randomFloat(2, 1000, 30000),
            'allocated_at' => now()->toDateString(),
        ];
    }
}
