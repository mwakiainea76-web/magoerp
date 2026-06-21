<?php

namespace App\Http\Requests;

use App\Models\FeePlan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFeePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.update') ?? false;
    }

    public function rules(): array
    {
        /** @var FeePlan|null $feePlan */
        $feePlan = $this->route('fee_plan');

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('fee_plans', 'code')->ignore($feePlan?->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
