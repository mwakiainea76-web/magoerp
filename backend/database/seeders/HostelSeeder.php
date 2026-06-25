<?php

namespace Database\Seeders;

use App\Models\Hostel;
use App\Models\HostelRoom;
use App\Models\HostelBed;
use Illuminate\Database\Seeder;

class HostelSeeder extends Seeder
{
    public function run(): void
    {
        $hostels = [
            ['name' => 'Mago Main Hostel', 'code' => 'MH-MAIN', 'gender' => 'male', 'session_fee_amount' => 15000],
            ['name' => 'Mago Ladies Hostel', 'code' => 'MH-LADIES', 'gender' => 'female', 'session_fee_amount' => 15000],
        ];

        foreach ($hostels as $h) {
            $hostel = Hostel::updateOrCreate(
                ['code' => $h['code']],
                [
                    'name' => $h['name'],
                    'gender' => $h['gender'],
                    'session_fee_amount' => $h['session_fee_amount'],
                    'location' => 'Main Campus',
                    'is_active' => true,
                ]
            );

            if ($hostel->rooms()->count() === 0) {
                for ($roomNum = 1; $roomNum <= 4; $roomNum++) {
                    $room = HostelRoom::create([
                        'hostel_id' => $hostel->id,
                        'name' => "Room {$roomNum}",
                        'code' => "{$h['code']}-R{$roomNum}",
                        'floor' => 1,
                        'bed_count' => 4,
                        'is_active' => true,
                    ]);

                    for ($bedNum = 1; $bedNum <= 4; $bedNum++) {
                        HostelBed::create([
                            'hostel_room_id' => $room->id,
                            'bed_number' => $bedNum,
                            'label' => "Bed {$bedNum}",
                            'is_active' => true,
                        ]);
                    }
                }
            }
        }
    }
}
