<?php

namespace App\Http\Requests;

use App\Enums\AttendanceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class MarkAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'unit_id' => ['required', 'string', 'exists:units,id'],
            'session_date' => ['required', 'date', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
            'records' => ['required', 'array', 'max:500'],
            'records.*.unit_enrolment_id' => ['required', 'string', 'exists:student_unit_registrations,id'],
            'records.*.status' => ['required', 'string', new Enum(AttendanceStatus::class)],
            'records.*.remarks' => ['nullable', 'string', 'max:500'],
        ];
    }
}