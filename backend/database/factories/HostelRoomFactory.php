<?php

namespace Database\Factories;

use App\Models\Hostel;
use App\Models\HostelRoom;
use Illuminate\Database\Eloquent\Factories\Factory;

class HostelRoomFactory extends Factory
{
    protected $model = HostelRoom::class;

    public function definition(): array
    {
        $roomNum = fake()->unique()->numberBetween(1, 99);

        return [
            'hostel_id' => Hostel::factory(),
            'name' => "Room {$roomNum}",
            'code' => 'R' . str_pad((string) $roomNum, 2, '0', STR_PAD_LEFT),
            'floor' => fake()->numberBetween(1, 5),
            'bed_count' => fake()->numberBetween(2, 6),
            'is_active' => true,
        ];
    }
}
