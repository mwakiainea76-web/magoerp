<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->user;
        $activeEnrolment = $this->relationLoaded('activeEnrolment') ? $this->activeEnrolment : null;
        $course = $activeEnrolment?->courseCurriculum?->course;

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'login_id' => $user?->login_id,
            'email' => $user?->email,
            'admission_number' => $this->admission_number,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'full_name' => trim(collect([$user->first_name, $user->middle_name, $user->last_name])->filter()->implode(' ')),
            'gender' => $user?->gender,
            'date_of_birth' => $user?->date_of_birth?->format('Y-m-d'),
            'nationality' => $user?->nationality,
            'national_id' => $user?->national_id,
            'place_of_birth' => $user?->place_of_birth,
            'religion' => $user?->religion,
            'phone_number' => $user?->phone_number,
            'alternative_phone_number' => $user?->alternative_phone_number,
            'county' => $user?->county,
            'course_id' => $course?->id,
            'course_name' => $course?->name,
            'course_code' => $course?->code,
            'course_initials' => $course?->initials,
            'is_pwd' => $user?->is_pwd,
            'disability_type' => $user?->disability_type,
            'disability_description' => $user?->disability_description,
            'next_of_kin_first_name' => $user?->next_of_kin_first_name,
            'next_of_kin_last_name' => $user?->next_of_kin_last_name,
            'next_of_kin_phone' => $user?->next_of_kin_phone,
            'next_of_kin_alt_phone' => $user?->next_of_kin_alt_phone,
            'next_of_kin_email' => $user?->next_of_kin_email,
            'next_of_kin_relationship' => $user?->next_of_kin_relationship,
            'active_enrolment' => $activeEnrolment ? new CourseEnrolmentResource($activeEnrolment) : null,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
