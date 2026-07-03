<?php

namespace App\Http\Requests;

use App\Models\FeeTemplateItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFeeTemplateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.update') ?? false;
    }

    public function rules(): array
    {
        /** @var FeeTemplateItem|null $item */
        $item = $this->route('fee_template_item');

        return [
            'fee_template_id' => ['required', 'uuid', Rule::exists('fee_templates', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
