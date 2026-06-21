<?php

namespace App\Http\Requests;

use App\Models\AcademicYear;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAcademicYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        /** @var AcademicYear|null $academicYear */
        $academicYear = $this->route('academic_year');

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('academic_years', 'code')->ignore($academicYear?->id),
            ],
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('academic_years', 'name')->ignore($academicYear?->id),
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
            if ($this->boolean('is_active')) {
                /** @var AcademicYear|null $academicYear */
                $academicYear = $this->route('academic_year');

                $conflicting = AcademicYear::where('is_active', true);

                if ($academicYear) {
                    $conflicting->where('id', '!=', $academicYear->id);
                }

                if ($conflicting->exists()) {
                    $validator->errors()->add(
                        'is_active',
                        'Another academic year is already active. Please disable it first before activating this one.',
                    );
                }
            }
        });
    }
}
