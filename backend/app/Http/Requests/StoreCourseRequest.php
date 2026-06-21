<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'unique:courses,code'],
            'initials' => ['required', 'string', 'max:20'],
            'name' => ['required', 'string', 'max:255'],
            'duration' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
            'certification_authority_id' => ['required', 'string', 'exists:certification_authorities,id'],
            'certification_level_id' => ['required', 'string', 'exists:certification_levels,id'],
            'department_id' => ['required', 'string', 'exists:departments,id'],
            'curriculum_id' => ['nullable', 'string', 'exists:curricula,id'],
        ];
    }
}
