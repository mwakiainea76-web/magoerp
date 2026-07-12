<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoiceLineItemFactory extends Factory
{
    protected $model = InvoiceLineItem::class;

    public function definition(): array
    {
        $unitAmount = fake()->randomFloat(2, 1000, 50000);
        $quantity = fake()->numberBetween(1, 3);

        return [
            'invoice_id' => Invoice::factory(),
            'fee_structure_item_id' => null,
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'amount' => $unitAmount,
            'quantity' => $quantity,
            'total_amount' => $unitAmount * $quantity,
        ];
    }
}
