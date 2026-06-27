<?php

namespace Database\Factories;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelBed;
use App\Models\HostelRoom;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class HostelAllocationFactory extends Factory
{
    protected $model = HostelAllocation::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'academic_session_id' => AcademicSession::factory(),
            'hostel_id' => Hostel::factory(),
            'hostel_room_id' => HostelRoom::factory(),
            'hostel_bed_id' => HostelBed::factory(),
            'hostel_fee_amount' => fake()->randomFloat(2, 8000, 25000),
            'allocated_on' => now()->toDateString(),
            'status' => 'active',
            'notes' => fake()->optional()->sentence(),
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
