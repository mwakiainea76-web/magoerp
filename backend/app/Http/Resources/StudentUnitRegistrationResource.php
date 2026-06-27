<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentUnitRegistrationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $academicSessionEnrolment = $this->relationLoaded('academicSessionEnrolment') ? $this->academicSessionEnrolment : null;

        return [
            'id' => $this->id,
            'academic_session_enrolment_id' => $this->academic_session_enrolment_id,
            'unit_id' => $this->unit_id,
            'unit_code' => $this->unit?->code,
            'unit_name' => $this->unit?->name,
            'student' => $academicSessionEnrolment?->student ? [
                'id' => $academicSessionEnrolment->student->id,
                'admission_number' => $academicSessionEnrolment->student->admission_number,
                'full_name' => $academicSessionEnrolment->student->full_name,
            ] : null,
            'academic_session' => $academicSessionEnrolment?->academicSession ? [
                'id' => $academicSessionEnrolment->academicSession->id,
                'name' => $academicSessionEnrolment->academicSession->name,
            ] : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
