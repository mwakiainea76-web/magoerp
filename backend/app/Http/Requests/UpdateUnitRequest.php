<?php

namespace App\Http\Requests;

use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        /** @var Unit|null $unit */
        $unit = $this->route('unit');

        return [
            'course_curriculum_id' => ['required', 'string', 'exists:course_curricula,id'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('units', 'code')
                    ->ignore($unit?->id)
                    ->where('course_curriculum_id', $this->course_curriculum_id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'module' => ['nullable', 'integer', 'min:1', 'max:99'],
            'year_of_study' => ['nullable', 'integer', 'min:1', 'max:20'],
            'session_number' => ['nullable', 'integer', 'min:1', 'max:3'],
            'modules_taught' => ['nullable', 'integer', 'min:1', 'max:20'],
            'taught_hours' => ['nullable', 'integer', 'min:1', 'max:500'],
            'credit_factor' => ['nullable', 'numeric', 'min:0.01'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}