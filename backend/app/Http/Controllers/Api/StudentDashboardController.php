<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CourseEnrolment;
use App\Models\CourseInvoiceTemplate;
use App\Models\Invoice;
use App\Models\LedgerTransaction;
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
            ->latest()
            ->first();

        $currentSession = AcademicSession::query()
            ->where('is_active', true)
            ->latest('start_date')
            ->first();

        $lastSessionEnrolment = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->with('academicSession')
            ->latest()
            ->first();

        $needsSessionEnrolment = true;
        if ($lastSessionEnrolment?->academicSession) {
            $needsSessionEnrolment = !$lastSessionEnrolment->academicSession->is_active;
        }

        $courseInvoiceTemplate = null;
        $invoiceTemplateItems = [];
        $totalFee = 0;

        if ($course) {
            $courseInvoiceTemplate = CourseInvoiceTemplate::query()
                ->where('course_id', $course->id)
                ->with('invoiceTemplate.items')
                ->first();

            if ($courseInvoiceTemplate?->invoiceTemplate) {
                $invoiceTemplateItems = $courseInvoiceTemplate->invoiceTemplate->items->map(fn ($item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'amount' => (float) $item->amount,
                    'description' => $item->description,
                ])->values()->all();

                $totalFee = $courseInvoiceTemplate->invoiceTemplate->items->sum('amount');
            }
        }

        $outstandingBalance = (float) Invoice::query()
            ->where('student_id', $student->id)
            ->where('balance_due', '>', 0)
            ->sum('balance_due');

        $totalPaid = (float) Invoice::query()
            ->where('student_id', $student->id)
            ->sum('paid_amount');

        $nextDueDate = Invoice::query()
            ->where('student_id', $student->id)
            ->where('balance_due', '>', 0)
            ->orderBy('due_date')
            ->value('due_date');

        return response()->json([
            'data' => [
                'student' => [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'name' => trim($student->first_name . ' ' . $student->last_name),
                ],
                'finance' => [
                    'outstanding_balance' => $outstandingBalance,
                    'total_paid' => $totalPaid,
                    'next_due_date' => $nextDueDate?->format('Y-m-d'),
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
                    'academic_session' => $lastSessionEnrolment?->academicSession ? [
                        'id' => $lastSessionEnrolment->academicSession->id,
                        'name' => $lastSessionEnrolment->academicSession->name,
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
                'needs_session_enrolment' => $needsSessionEnrolment,
                'last_session_enrolment' => $lastSessionEnrolment ? [
                    'id' => $lastSessionEnrolment->id,
                    'session_name' => $lastSessionEnrolment->academicSession?->name,
                    'session_active' => $lastSessionEnrolment->academicSession?->is_active ?? false,
                    'year_of_study' => $lastSessionEnrolment->year_of_study,
                    'session_number' => $lastSessionEnrolment->session_number,
                    'module' => $lastSessionEnrolment->module,
                    'enrolled_at' => $lastSessionEnrolment->enrolled_at,
                ] : null,

                'progress' => AcademicSessionEnrolment::currentProgress($student),

                'invoice_template' => $courseInvoiceTemplate ? [
                    'id' => $courseInvoiceTemplate->id,
                    'code' => $courseInvoiceTemplate->invoiceTemplate->code,
                    'name' => $courseInvoiceTemplate->invoiceTemplate->name,
                    'year_level' => $courseInvoiceTemplate->year_level,
                    'session_number' => $courseInvoiceTemplate->session_number,
                    'is_approved' => $courseInvoiceTemplate->is_approved,
                    'items' => $invoiceTemplateItems,
                    'total_amount' => $totalFee,
                ] : null,
            ],
        ]);
    }
}
