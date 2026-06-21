<?php

namespace App\Http\Requests;

use App\Models\departments;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatedepartmentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.update') ?? false;
    }

    public function rules(): array
    {
        /** @var departments|null $department */
        $department = $this->route('department');

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('departments', 'code')->ignore($department?->id),
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('departments', 'name')->ignore($department?->id),
            ],
            'head_of_department' => ['nullable', 'uuid', Rule::exists('staffs', 'id')->whereNull('deleted_at')],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
