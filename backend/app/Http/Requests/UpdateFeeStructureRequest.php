<?php

namespace App\Http\Requests;

use App\Models\FeeStructure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFeeStructureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.update') ?? false;
    }

    public function rules(): array
    {
        /** @var FeeStructure|null $template */
        $template = $this->route('fee_structure');

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('fee_structures', 'code')->ignore($template?->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
