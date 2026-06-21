<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorestaffsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('staff.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'string', Rule::in(['admin', 'trainer'])],

            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', 'string', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['required', 'date'],
            'nationality' => ['required', 'string', 'max:255'],
            'national_id' => ['required', 'string', 'max:255'],
            'place_of_birth' => ['required', 'string', 'max:255'],
            'religion' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:50'],
            'alternative_phone_number' => ['required', 'string', 'max:50'],

            'county' => ['required', 'string', 'max:255'],

            'department_id' => ['required', 'uuid', Rule::exists('departments', 'id')->whereNull('deleted_at')],
            'job_title' => ['required', 'string', 'max:255'],
            'employment_type' => ['required', 'string', Rule::in(['Permanent', 'Contract', 'Part-time', 'Casual'])],
            'date_joined' => ['nullable', 'date'],
            'contract_end_date' => ['nullable', 'date'],
            'basic_salary' => ['required', 'numeric', 'min:0'],

            'kra_pin' => ['required', 'string', 'max:255', 'unique:staffs,kra_pin'],
            'nhif_number' => ['required', 'string', 'max:255'],
            'nssf_number' => ['required', 'string', 'max:255'],

            'highest_qualification' => ['required', 'string', Rule::in(['PHD', 'Masters', 'Degree', 'Diploma', 'Certificate', 'Other'])],
            'specialization' => ['required', 'string', 'max:255'],


            'is_pwd' => ['required', 'boolean'],
            'disability_type' => ['required', 'string', 'max:255'],
            'disability_description' => ['required', 'string'],

            'next_of_kin_first_name' => ['required', 'string', 'max:255'],
            'next_of_kin_last_name' => ['required', 'string', 'max:255'],
            'next_of_kin_phone' => ['required', 'string', 'max:50'],
            'next_of_kin_alt_phone' => ['required', 'string', 'max:50'],
            'next_of_kin_email' => ['required', 'email', 'max:255'],
            'next_of_kin_relationship' => ['required', 'string', Rule::in(['Partner', 'Sibling', 'Father', 'Mother', 'Relative', 'Guardian'])],

            'status' => ['required', 'boolean'],
        ];
    }
}



