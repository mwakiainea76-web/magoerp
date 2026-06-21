<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCourseEnrolmentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('enrolments.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in([
                'enrolled', 'deferred', 'expelled', 'transferred', 'completed', 'withdrawn',
            ])],
            'remarks' => ['nullable', 'string', 'max:2000'],
            'course_id' => ['nullable', 'uuid', Rule::exists('courses', 'id')],
        ];
    }
}
