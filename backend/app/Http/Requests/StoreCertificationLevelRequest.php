<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCertificationLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'certification_authority_id' => ['required', 'uuid', Rule::exists('certification_authorities', 'id')],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('certification_levels', 'code')
                    ->where(fn ($query) => $query->where('certification_authority_id', $this->input('certification_authority_id'))),
            ],
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('certification_levels', 'name')
                    ->where(fn ($query) => $query->where('certification_authority_id', $this->input('certification_authority_id'))),
            ],
            'entry_grade' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}