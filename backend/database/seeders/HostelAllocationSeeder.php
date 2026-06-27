<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelBed;
use Illuminate\Database\Seeder;

class HostelAllocationSeeder extends Seeder
{
    public function run(): void
    {
        $session = AcademicSession::where('is_active', true)->first();
        if (!$session) {
            return;
        }

        $maleHostel = Hostel::where('gender', 'male')->first();
        $femaleHostel = Hostel::where('gender', 'female')->first();

        AcademicSessionEnrolment::take(4)->get()->each(function (AcademicSessionEnrolment $enrolment, $index) use ($session, $maleHostel, $femaleHostel) {
            $student = $enrolment->student;
            $hostel = $student?->user?->gender === 'female' ? $femaleHostel : $maleHostel;
            if (!$hostel) {
                return;
            }

            $room = $hostel->rooms()->first();
            if (!$room) {
                return;
            }

            $bed = $room->beds()->skip($index % $room->bed_count)->first();
            if (!$bed) {
                return;
            }

            HostelAllocation::updateOrCreate(
                ['academic_session_enrolment_id' => $enrolment->id],
                [
                    'hostel_room_id' => $room->id,
                    'hostel_bed_id' => $bed->id,
                    'hostel_fee_amount' => $hostel->session_fee_amount,
                    'allocated_on' => now()->toDateString(),
                    'status' => 'active',
                ]
            );
        });
    }
}
