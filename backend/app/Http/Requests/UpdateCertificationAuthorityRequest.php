<?php

namespace App\Http\Requests;

use App\Models\CertificationAuthority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCertificationAuthorityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        /** @var CertificationAuthority|null $authority */
        $authority = $this->route('certification_authority');

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('certification_authorities', 'code')->ignore($authority?->id),
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('certification_authorities', 'name')->ignore($authority?->id),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}