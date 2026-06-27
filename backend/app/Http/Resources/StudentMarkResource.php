<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentMarkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $enrolment = $this->relationLoaded('academicSessionEnrolment') ? $this->academicSessionEnrolment : null;

        return [
            'id' => $this->id,
            'academic_session_enrolment_id' => $this->academic_session_enrolment_id,
            'unit_id' => $this->unit_id,
            'unit_code' => $this->unit?->code,
            'unit_name' => $this->unit?->name,
            'assessment_type' => $this->assessment_type,
            'assessment_number' => $this->assessment_number,
            'score' => $this->score,
            'marks' => $this->marks,
            'is_published' => $this->is_published,
            'student' => $enrolment?->student ? [
                'id' => $enrolment->student->id,
                'admission_number' => $enrolment->student->admission_number,
                'full_name' => $enrolment->student->full_name,
            ] : null,
            'academic_session' => $enrolment?->academicSession ? [
                'id' => $enrolment->academicSession->id,
                'name' => $enrolment->academicSession->name,
            ] : null,
            'recorded_by' => $this->recordedBy ? [
                'id' => $this->recordedBy->id,
                'name' => trim(collect([$this->recordedBy->first_name, $this->recordedBy->middle_name, $this->recordedBy->last_name])->filter()->implode(' ')),
            ] : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
