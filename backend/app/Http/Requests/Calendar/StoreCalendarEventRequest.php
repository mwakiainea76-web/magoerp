<?php

namespace App\Http\Requests\Calendar;

use Illuminate\Foundation\Http\FormRequest;

class StoreCalendarEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event_type_id'       => 'required|string|exists:calendar_event_types,id',
            'title'               => 'required|string|max:255',
            'description'         => 'nullable|string',
            'start_date'          => 'required|date',
            'end_date'            => 'required|date|after_or_equal:start_date',
        ];
    }
}