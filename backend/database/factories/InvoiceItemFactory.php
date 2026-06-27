<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoiceItemFactory extends Factory
{
    protected $model = InvoiceItem::class;

    public function definition(): array
    {
        $unitAmount = fake()->randomFloat(2, 1000, 50000);
        $quantity = fake()->numberBetween(1, 3);

        return [
            'invoice_id' => Invoice::factory(),
            'invoice_template_item_id' => null,
            'description' => fake()->words(3, true),
            'unit_amount' => $unitAmount,
            'quantity' => $quantity,
            'total_amount' => $unitAmount * $quantity,
        ];
    }
}
