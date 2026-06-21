<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCurriculumRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'certification_authority_id' => ['required', 'string', 'exists:certification_authorities,id'],
            'code' => ['required', 'string', 'max:50', 'unique:curricula,code'],
            'name' => ['required', 'string', 'max:255', 'unique:curricula,name'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
