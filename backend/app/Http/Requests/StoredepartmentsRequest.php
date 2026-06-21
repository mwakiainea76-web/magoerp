<?php

namespace App\Http\Requests;

use App\Models\departments;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoredepartmentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('institution.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'unique:departments,code'],
            'name' => ['required', 'string', 'max:255', 'unique:departments,name'],
            'head_of_department' => ['nullable', 'uuid', Rule::exists('staffs', 'id')->whereNull('deleted_at')],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
