<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelBed;
use App\Models\Student;
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

        Student::take(4)->get()->each(function (Student $student, $index) use ($session, $maleHostel, $femaleHostel) {
            $hostel = $student->user?->gender === 'female' ? $femaleHostel : $maleHostel;
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

            $enrolment = AcademicSessionEnrolment::where('student_id', $student->id)
                ->where('academic_session_id', $session->id)
                ->first();

            HostelAllocation::updateOrCreate(
                ['student_id' => $student->id, 'academic_session_id' => $session->id],
                [
                    'academic_session_enrolment_id' => $enrolment?->id,
                    'hostel_id' => $hostel->id,
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
