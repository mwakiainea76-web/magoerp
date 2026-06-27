<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseChangeLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'old_admission_number' => $this->old_admission_number,
            'new_admission_number' => $this->new_admission_number,
            'old_course_curriculum_id' => $this->old_course_curriculum_id,
            'new_course_curriculum_id' => $this->new_course_curriculum_id,
            'old_course_curriculum' => $this->relationLoaded('oldCourseCurriculum') && $this->oldCourseCurriculum ? [
                'id' => $this->oldCourseCurriculum->id,
                'course_id' => $this->oldCourseCurriculum->course_id,
                'curriculum_id' => $this->oldCourseCurriculum->curriculum_id,
            ] : null,
            'new_course_curriculum' => $this->relationLoaded('newCourseCurriculum') && $this->newCourseCurriculum ? [
                'id' => $this->newCourseCurriculum->id,
                'course_id' => $this->newCourseCurriculum->course_id,
                'curriculum_id' => $this->newCourseCurriculum->curriculum_id,
            ] : null,
            'old_status' => $this->old_status,
            'new_status' => $this->new_status,
            'notes' => $this->notes,
            'processed_by' => $this->processedBy ? trim(collect([$this->processedBy->first_name, $this->processedBy->middle_name, $this->processedBy->last_name])->filter()->implode(' ')) : null,
            'changed_at' => $this->changed_at?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at,
        ];
    }
}
