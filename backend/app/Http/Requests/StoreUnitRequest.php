<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'course_curriculum_id' => ['required', 'string', 'exists:course_curricula,id'],
            'code' => [
                'required',
                'string',
                'max:50',
                'unique:units,code,NULL,id,course_curriculum_id,' . $this->course_curriculum_id,
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'modules_taught' => ['nullable', 'integer', 'min:1', 'max:99'],
            'year_of_study' => ['nullable', 'integer', 'min:1', 'max:20'],
            'session_number' => ['nullable', 'integer', 'min:1', 'max:3'],
            'taught_hours' => ['nullable', 'integer', 'min:1', 'max:500'],
            'credit_factor' => ['nullable', 'numeric', 'min:0.01'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}