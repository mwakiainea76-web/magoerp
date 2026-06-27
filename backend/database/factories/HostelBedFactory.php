<?php

namespace Database\Factories;

use App\Models\HostelBed;
use App\Models\HostelRoom;
use Illuminate\Database\Eloquent\Factories\Factory;

class HostelBedFactory extends Factory
{
    protected $model = HostelBed::class;

    public function definition(): array
    {
        $bedNum = fake()->numberBetween(1, 6);

        return [
            'hostel_room_id' => HostelRoom::factory(),
            'bed_number' => $bedNum,
            'label' => "Bed {$bedNum}",
            'is_active' => true,
        ];
    }
}
