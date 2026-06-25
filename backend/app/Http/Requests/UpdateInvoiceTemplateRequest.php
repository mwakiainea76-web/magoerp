<?php

namespace App\Http\Requests;

use App\Models\InvoiceTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInvoiceTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.update') ?? false;
    }

    public function rules(): array
    {
        /** @var InvoiceTemplate|null $template */
        $template = $this->route('invoice_template');

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('invoice_templates', 'code')->ignore($template?->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
