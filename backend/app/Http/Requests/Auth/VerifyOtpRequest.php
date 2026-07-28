<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class VerifyOtpRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'temporary_token' => ['required', 'string', 'exists:otps,temporary_token'],
            'otp' => ['required', 'string', 'size:6'],
        ];
    }
}
