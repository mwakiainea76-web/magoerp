<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreCertificationAuthorityGradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'grade' => [
                'required',
                'string',
                'max:50',
            ],
            'grade_start' => ['required', 'numeric', 'min:0', 'max:100'],
            'grade_end' => ['required', 'numeric', 'min:0', 'max:100', 'gte:grade_start'],
            'remark' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $data = $validator->safe();
            $authorityId = $this->route('certification_authority')?->id
                ?? $this->input('certification_authority_id');

            if (!$authorityId) {
                return;
            }

            $gradeStart = (float) $data['grade_start'];
            $gradeEnd = (float) $data['grade_end'];

            $exists = \App\Models\CertificationAuthorityGrade::where('certification_authority_id', $authorityId)
                ->where('grade_end', '>=', $gradeStart)
                ->where('grade_start', '<=', $gradeEnd)
                ->exists();

            if ($exists) {
                $validator->errors()->add('grade_start', 'The grade range overlaps with an existing grade for this certification authority.');
            }
        });
    }
}
