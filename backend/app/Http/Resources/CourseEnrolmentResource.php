<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseEnrolmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'student_name' => $this->student?->full_name ?? trim(collect([$this->student?->first_name, $this->student?->middle_name, $this->student?->last_name])->filter()->implode(' ')),
            'admission_number' => $this->student?->admission_number,
            'course_id' => $this->courseCurriculum?->course_id,
            'course_curriculum_id' => $this->course_curriculum_id,
            'course_code' => $this->courseCurriculum?->course?->code,
            'course_name' => $this->courseCurriculum?->course?->name,
            'curriculum_id' => $this->courseCurriculum?->curriculum_id,
            'curriculum_name' => $this->courseCurriculum?->curriculum?->name,
            'academic_session_id' => $this->academic_session_id,
            'academic_session_name' => $this->academicSession?->name,
            'enrolment_date' => $this->enrolment_date?->format('Y-m-d'),
            'status' => $this->status,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
