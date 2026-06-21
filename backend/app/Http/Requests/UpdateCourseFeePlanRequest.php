<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCourseFeePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'fee_plan_id' => ['sometimes', 'uuid', Rule::exists('fee_plans', 'id')],
            'is_approved' => ['sometimes', 'boolean'],
        ];
    }
}
