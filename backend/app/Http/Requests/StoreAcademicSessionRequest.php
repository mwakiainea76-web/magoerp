<?php

namespace App\Http\Requests;

use App\Models\AcademicSession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAcademicSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'academic_year_id' => ['required', 'uuid', Rule::exists('academic_years', 'id')],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('academic_sessions', 'code')
                    ->where(fn ($query) => $query->where('academic_year_id', $this->input('academic_year_id'))),
            ],
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('academic_sessions', 'name')
                    ->where(fn ($query) => $query->where('academic_year_id', $this->input('academic_year_id'))),
            ],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->boolean('is_active') && AcademicSession::where('is_active', true)->exists()) {
                $validator->errors()->add(
                    'is_active',
                    'Another academic session is already active. Please disable it first before activating this one.',
                );
            }
        });
    }
}
