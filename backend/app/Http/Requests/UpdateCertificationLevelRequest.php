<?php

namespace App\Http\Requests;

use App\Models\CertificationLevel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCertificationLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        /** @var CertificationLevel|null $level */
        $level = $this->route('certification_level');

        return [
            'certification_authority_id' => ['required', 'uuid', Rule::exists('certification_authorities', 'id')],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('certification_levels', 'code')
                    ->where(fn ($query) => $query->where('certification_authority_id', $this->input('certification_authority_id')))
                    ->ignore($level?->id),
            ],
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('certification_levels', 'name')
                    ->where(fn ($query) => $query->where('certification_authority_id', $this->input('certification_authority_id')))
                    ->ignore($level?->id),
            ],
            'entry_grade' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}