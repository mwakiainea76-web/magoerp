<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\staffs;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminPasswordResetController extends Controller
{
    public function resetStaffPassword(Request $request): JsonResponse
    {
        $request->validate(['employee_number' => 'required|string']);

        $staff = staffs::where('employee_number', $request->employee_number)->first();

        if (!$staff || !$staff->user) {
            throw ValidationException::withMessages([
                'employee_number' => ['No staff found with that employee number.'],
            ]);
        }

        $user = $staff->user;
        $user->password = Hash::make('password');
        $user->must_reset_password = true;
        $user->save();

        return response()->json(['message' => 'Staff password has been reset. The staff member must change their password on next login.']);
    }

    public function resetStudentPassword(Request $request): JsonResponse
    {
        $request->validate(['admission_number' => 'required|string']);

        $student = Student::where('admission_number', $request->admission_number)->first();

        if (!$student || !$student->user) {
            throw ValidationException::withMessages([
                'admission_number' => ['No student found with that admission number.'],
            ]);
        }

        $user = $student->user;
        $defaultPassword = $user->phone_number ?? 'password';
        $user->password = Hash::make($defaultPassword);
        $user->must_reset_password = true;
        $user->save();

        return response()->json(['message' => 'Student password has been reset to their registered phone number. The student must change their password on next login.']);
    }
}
