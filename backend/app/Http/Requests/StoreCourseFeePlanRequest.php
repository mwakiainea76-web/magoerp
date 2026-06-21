<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCourseFeePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        /** @var \App\Models\Course|null $course */
        $course = $this->route('course');

        return [
            'fee_plan_id' => ['required', 'uuid', Rule::exists('fee_plans', 'id')],
            'year_level' => ['required', 'integer', 'min:1', 'max:10'],
            'session_number' => ['required', 'integer', 'min:1', 'max:10'],
            'is_approved' => ['boolean'],
        ];
    }
}
