<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CourseEnrolment;
use App\Models\CourseFeePlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        $student = $user->student;
        if (!$student) {
            return response()->json([
                'message' => 'Student profile not found.',
            ], 404);
        }

        $course = $student->course;
        $courseEnrolment = CourseEnrolment::query()
            ->where('student_id', $student->id)
            ->with('academicSession')
            ->latest()
            ->first();

        $currentSession = AcademicSession::query()
            ->where('is_active', true)
            ->latest('start_date')
            ->first();

        $hasSessionEnrolment = false;
        if ($currentSession && $student) {
            $hasSessionEnrolment = AcademicSessionEnrolment::query()
                ->where('student_id', $student->id)
                ->where('academic_session_id', $currentSession->id)
                ->exists();
        }

        $courseFeePlan = null;
        $feePlanItems = [];
        $totalFee = 0;

        if ($course) {
            $courseFeePlan = CourseFeePlan::query()
                ->where('course_id', $course->id)
                ->with('feePlan.items')
                ->first();

            if ($courseFeePlan?->feePlan) {
                $feePlanItems = $courseFeePlan->feePlan->items->map(fn ($item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'amount' => (float) $item->amount,
                    'description' => $item->description,
                ])->values()->all();

                $totalFee = $courseFeePlan->feePlan->items->sum('amount');
            }
        }

        return response()->json([
            'data' => [
                'student' => [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'name' => trim($student->first_name . ' ' . $student->last_name),
                ],
                'course' => $course ? [
                    'id' => $course->id,
                    'code' => $course->code,
                    'name' => $course->name,
                    'duration' => $course->duration,
                    'level' => $course->level?->name,
                ] : null,
                'enrolment' => $courseEnrolment ? [
                    'id' => $courseEnrolment->id,
                    'status' => $courseEnrolment->status,
                    'enrolment_date' => $courseEnrolment->enrolment_date,
                    'academic_session' => $courseEnrolment->academicSession ? [
                        'id' => $courseEnrolment->academicSession->id,
                        'name' => $courseEnrolment->academicSession->name,
                    ] : null,
                    'curriculum' => $courseEnrolment->curriculum ? [
                        'id' => $courseEnrolment->curriculum->id,
                        'code' => $courseEnrolment->curriculum->code,
                        'name' => $courseEnrolment->curriculum->name,
                    ] : null,
                ] : null,
                'current_session' => $currentSession ? [
                    'id' => $currentSession->id,
                    'name' => $currentSession->name,
                ] : null,
                'needs_session_enrolment' => !$hasSessionEnrolment,

                'fee_plan' => $courseFeePlan ? [
                    'id' => $courseFeePlan->id,
                    'code' => $courseFeePlan->feePlan->code,
                    'name' => $courseFeePlan->feePlan->name,
                    'year_level' => $courseFeePlan->year_level,
                    'session_number' => $courseFeePlan->session_number,
                    'is_approved' => $courseFeePlan->is_approved,
                    'items' => $feePlanItems,
                    'total_amount' => $totalFee,
                ] : null,
            ],
        ]);
    }
}
