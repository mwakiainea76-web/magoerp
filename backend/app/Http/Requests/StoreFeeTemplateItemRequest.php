<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFeeTemplateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'fee_template_id' => ['required', 'uuid', Rule::exists('fee_templates', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
