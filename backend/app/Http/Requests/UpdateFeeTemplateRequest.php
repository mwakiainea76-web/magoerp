<?php

namespace App\Http\Requests;

use App\Models\FeeTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFeeTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.update') ?? false;
    }

    public function rules(): array
    {
        /** @var FeeTemplate|null $template */
        $template = $this->route('fee_template');

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('fee_templates', 'code')->ignore($template?->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
