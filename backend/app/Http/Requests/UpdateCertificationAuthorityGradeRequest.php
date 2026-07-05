<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateCertificationAuthorityGradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'grade' => ['sometimes', 'required', 'string', 'max:50'],
            'grade_start' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100'],
            'grade_end' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100', 'gte:grade_start'],
            'remark' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->safe()->missing('grade_start') || $validator->safe()->missing('grade_end')) {
                return;
            }

            $grade = $this->route('grade');
            $authorityId = $grade->certification_authority_id;
            $gradeStart = (float) $validator->safe()->grade_start;
            $gradeEnd = (float) $validator->safe()->grade_end;

            $exists = \App\Models\CertificationAuthorityGrade::where('certification_authority_id', $authorityId)
                ->where('id', '!=', $grade->id)
                ->where('grade_end', '>=', $gradeStart)
                ->where('grade_start', '<=', $gradeEnd)
                ->exists();

            if ($exists) {
                $validator->errors()->add('grade_start', 'The grade range overlaps with an existing grade for this certification authority.');
            }
        });
    }
}
