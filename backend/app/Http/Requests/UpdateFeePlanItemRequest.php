<?php

namespace App\Http\Requests;

use App\Models\FeePlanItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFeePlanItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.update') ?? false;
    }

    public function rules(): array
    {
        /** @var FeePlanItem|null $item */
        $item = $this->route('fee_plan_item');

        return [
            'fee_plan_id' => ['required', 'uuid', Rule::exists('fee_plans', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
