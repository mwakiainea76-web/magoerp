<?php

namespace Database\Seeders;

use App\Models\Complaint;
use App\Models\Student;
use App\Models\staffs;
use Illuminate\Database\Seeder;

class ComplaintsSeeder extends Seeder
{
    public function run(): void
    {
        $student = Student::first();
        if (!$student) {
            return;
        }

        $staff = staffs::first();

        Complaint::updateOrCreate(
            ['student_id' => $student->id, 'subject' => 'Missing examination results'],
            [
                'description' => 'My CAT 1 results for ICT101 are not yet posted. It has been two weeks since the assessment.',
                'status' => 'pending',
            ]
        );

        Complaint::updateOrCreate(
            ['student_id' => $student->id, 'subject' => 'Library fine discrepancy'],
            [
                'description' => 'I was charged a library fine of KES 500 but I returned all books on time.',
                'status' => 'escalated',
                'escalated_to' => $staff?->id,
                'escalated_at' => now()->subDays(2),
            ]
        );

        Complaint::updateOrCreate(
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
