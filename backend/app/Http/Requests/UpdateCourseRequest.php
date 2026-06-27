<?php

namespace App\Http\Requests;

use App\Models\Course;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        /** @var Course|null $course */
        $course = $this->route('course');

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('courses', 'code')->ignore($course?->id),
            ],
            'initials' => ['required', 'string', 'max:20'],
            'name' => ['required', 'string', 'max:255'],
            'duration_months' => ['required', 'integer', 'min:1'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
            'certification_authority_id' => ['required', 'string', 'exists:certification_authorities,id'],
            'certification_level_id' => ['required', 'string', 'exists:certification_levels,id'],
            'department_id' => ['required', 'string', 'exists:departments,id'],
        ];
    }
}
