<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('students.update') ?? false;
    }

    public function rules(): array
    {
        $student = $this->route('student');
        $userId = $student?->user_id;

        return [
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', 'string', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['required', 'date'],
            'nationality' => ['required', 'string', 'max:255'],
            'national_id' => ['required', 'string', 'max:255'],
            'place_of_birth' => ['required', 'string', 'max:255'],
            'religion' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:50'],
            'alternative_phone_number' => ['required', 'string', 'max:50'],
            'county' => ['required', 'string', 'max:255'],
            'course_id' => ['required', 'uuid', Rule::exists('courses', 'id')],
            'enrollment_date' => ['nullable', 'date'],
            'is_pwd' => ['required', 'boolean'],
            'disability_type' => ['required', 'string', 'max:255'],
            'disability_description' => ['required', 'string'],
            'next_of_kin_first_name' => ['required', 'string', 'max:255'],
            'next_of_kin_last_name' => ['required', 'string', 'max:255'],
            'next_of_kin_phone' => ['required', 'string', 'max:50'],
            'next_of_kin_alt_phone' => ['required', 'string', 'max:50'],
            'next_of_kin_email' => ['required', 'email', 'max:255'],
            'next_of_kin_relationship' => ['required', 'string', Rule::in(['Partner', 'Sibling', 'Father', 'Mother', 'Relative', 'Guardian'])],
            'status' => ['required', 'boolean'],
        ];
    }
}
