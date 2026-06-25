<?php

namespace Database\Seeders;

use App\Models\departments;
use App\Models\LectureRoom;
use Illuminate\Database\Seeder;

class LectureRoomSeeder extends Seeder
{
    public function run(): void
    {
        $ictDept = departments::where('code', 'ICT')->first();

        $rooms = [
            ['name' => 'Lab 1', 'code' => 'LAB-01', 'capacity' => 40, 'location' => 'ICT Block, Ground Floor'],
            ['name' => 'Lab 2', 'code' => 'LAB-02', 'capacity' => 40, 'location' => 'ICT Block, Ground Floor'],
            ['name' => 'Lecture Hall A', 'code' => 'LH-A', 'capacity' => 80, 'location' => 'Main Campus, Block A'],
            ['name' => 'Lecture Hall B', 'code' => 'LH-B', 'capacity' => 60, 'location' => 'Main Campus, Block A'],
            ['name' => 'Seminar Room 1', 'code' => 'SR-01', 'capacity' => 30, 'location' => 'Admin Block, 2nd Floor'],
        ];

        foreach ($rooms as $room) {
            LectureRoom::updateOrCreate(
                ['code' => $room['code']],
                [
                    'department_id' => $ictDept?->id,
                    'name' => $room['name'],
                    'capacity' => $room['capacity'],
                    'location' => $room['location'],
                    'is_active' => true,
                ]
            );
        }
    }
}
