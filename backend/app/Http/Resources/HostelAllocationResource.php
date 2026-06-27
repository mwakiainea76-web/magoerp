<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HostelAllocationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $enrolment = $this->relationLoaded('academicSessionEnrolment') ? $this->academicSessionEnrolment : null;
        $hostel = $this->room?->hostel;

        return [
            'id' => $this->id,
            'academic_session_enrolment_id' => $this->academic_session_enrolment_id,
            'hostel_room_id' => $this->hostel_room_id,
            'hostel_bed_id' => $this->hostel_bed_id,
            'student' => $enrolment?->student ? [
                'id' => $enrolment->student->id,
                'admission_number' => $enrolment->student->admission_number,
                'full_name' => $enrolment->student->full_name,
            ] : null,
            'academic_session' => $enrolment?->academicSession ? [
                'id' => $enrolment->academicSession->id,
                'name' => $enrolment->academicSession->name,
            ] : null,
            'hostel' => $hostel ? [
                'id' => $hostel->id,
                'name' => $hostel->name,
                'code' => $hostel->code,
            ] : null,
            'room_name' => $this->room?->name,
            'bed_label' => $this->hostelBed?->label,
            'hostel_fee_amount' => (float) $this->hostel_fee_amount,
            'allocated_on' => $this->allocated_on?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
