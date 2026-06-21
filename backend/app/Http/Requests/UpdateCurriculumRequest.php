<?php

namespace App\Http\Requests;

use App\Models\Curriculum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCurriculumRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        /** @var Curriculum|null $curriculum */
        $curriculum = $this->route('curriculum');

        return [
            'certification_authority_id' => ['required', 'string', 'exists:certification_authorities,id'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('curricula', 'code')->ignore($curriculum?->id),
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('curricula', 'name')->ignore($curriculum?->id),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
