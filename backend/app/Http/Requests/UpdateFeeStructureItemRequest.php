<?php

namespace App\Http\Requests;

use App\Models\FeeStructureItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFeeStructureItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.update') ?? false;
    }

    public function rules(): array
    {
        /** @var FeeStructureItem|null $item */
        $item = $this->route('fee_structure_item');

        return [
            'fee_structure_id' => ['required', 'uuid', Rule::exists('fee_structures', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
