<?php

namespace App\Http\Requests;

use App\Models\InvoiceTemplateItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInvoiceTemplateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.update') ?? false;
    }

    public function rules(): array
    {
        /** @var InvoiceTemplateItem|null $item */
        $item = $this->route('invoice_template_item');

        return [
            'invoice_template_id' => ['required', 'uuid', Rule::exists('invoice_templates', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
