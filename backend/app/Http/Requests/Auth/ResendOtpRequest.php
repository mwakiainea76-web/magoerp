<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResendOtpRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'temporary_token' => [
                'required',
                'string',
                Rule::exists('otps', 'temporary_token')->whereNull('used_at'),
            ],
        ];
    }
}
