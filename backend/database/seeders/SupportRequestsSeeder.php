<?php

namespace Database\Seeders;

use App\Models\SupportRequest;
use App\Models\Student;
use App\Models\Staffs;
use Illuminate\Database\Seeder;

class SupportRequestsSeeder extends Seeder
{
    public function run(): void
    {
        $student = Student::first();
        if (!$student) {
            return;
        }

        $staff = Staffs::first();

        SupportRequest::updateOrCreate(
            ['student_id' => $student->id, 'subject' => 'Missing examination results'],
            [
                'description' => 'My CAT 1 results for ICT101 are not yet posted. It has been two weeks since the assessment.',
                'status' => 'pending',
            ]
        );

        SupportRequest::updateOrCreate(
            ['student_id' => $student->id, 'subject' => 'Library fine discrepancy'],
            [
                'description' => 'I was charged a library fine of KES 500 but I returned all books on time.',
                'status' => 'escalated',
                'escalated_to' => $staff?->id,
                'escalated_at' => now()->subDays(2),
            ]
        );

        SupportRequest::updateOrCreate(
            ['student_id' => $student->id, 'subject' => 'Hostel bed issue'],
            [
                'description' => 'The bed in Room 1 is broken and needs repair.',
                'status' => 'resolved',
                'admin_notes' => 'Maintenance team has been notified and the bed was repaired on the same day.',
                'resolved_at' => now()->subWeek(),
            ]
        );
    }
}
