<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CourseEnrolment;
use App\Models\CourseCurriculum;
use App\Models\CurriculumFeeAssignment;
use App\Models\Invoice;
use App\Models\StudentLedgerEntry;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
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
                'status_code' => 404,
                'message' => 'Student profile not found.',
            ], 404);
        }

        $courseEnrolment = CourseEnrolment::query()
            ->with('courseCurriculum.course')
            ->where('student_id', $student->id)
            ->latest()
            ->first();

        $course = $courseEnrolment?->courseCurriculum?->course;

        $currentSession = AcademicSession::query()
            ->where('is_active', true)
            ->latest('start_date')
            ->first();

        $lastSessionEnrolment = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->with('academicSession')
            ->latest()
            ->first();

        $currentSessionEnrolment = $currentSession
            ? AcademicSessionEnrolment::query()
                ->where('student_id', $student->id)
                ->where('academic_session_id', $currentSession->id)
                ->with('academicSession')
                ->first()
            : null;

        $displaySessionEnrolment = $currentSessionEnrolment ?? $lastSessionEnrolment;
        $needsSessionEnrolment = $currentSession ? !$currentSessionEnrolment : false;

        $courseInvoiceTemplate = null;
        $invoiceTemplateItems = [];
        $totalFee = 0;

        if ($course && $currentSession && $currentSessionEnrolment) {
            $courseCurriculumId = $courseEnrolment?->course_curriculum_id;

            $courseInvoiceTemplate = $courseCurriculumId
                ? CurriculumFeeAssignment::query()
                    ->where('course_curriculum_id', $courseCurriculumId)
                    ->where('is_approved', true)
                    ->where('year_level', $currentSessionEnrolment->year_of_study)
                    ->where('session_number', $currentSessionEnrolment->session_number)
                    ->where(function ($query) use ($currentSession) {
                        $query->where('academic_session_id', $currentSession->id)
                            ->orWhereNull('academic_session_id');
                    })
                    ->with(['feeTemplate.items' => fn ($query) => $query->where('is_active', true)])
                    ->orderByRaw('academic_session_id = ? desc', [$currentSession->id])
                    ->first()
                : null;

            if ($courseInvoiceTemplate?->feeTemplate) {
                $invoiceTemplateItems = $courseInvoiceTemplate->feeTemplate->items->map(fn ($item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'amount' => (float) $item->amount,
                    'description' => $item->description,
                ])->values()->all();

                $totalFee = $courseInvoiceTemplate->feeTemplate->items->sum('amount');
            }
        }

        $invoiceBaseQuery = Invoice::query()
            ->where('student_id', $student->id)
            ->where('status', '!=', 'cancelled')
            ->select('invoices.*')
            ->selectRaw('COALESCE((SELECT SUM(amount) FROM invoice_payment_allocations WHERE invoice_id = invoices.id), 0) as paid_amount')
            ->selectRaw('amount_due - COALESCE((SELECT SUM(amount) FROM invoice_payment_allocations WHERE invoice_id = invoices.id), 0) as balance_due');

        $invoices = $invoiceBaseQuery->get();
        $outstandingBalance = (float) $invoices->where('balance_due', '>', 0)->sum('balance_due');
        $totalPaid = (float) $invoices->sum('paid_amount');

        $nextDueInvoice = $invoices
            ->where('balance_due', '>', 0)
            ->sortBy('due_date')
            ->first();

        $availableUnits = collect();
        $registeredUnitIds = collect();

        if ($currentSessionEnrolment) {
            $registeredUnitIds = StudentUnitRegistration::query()
                ->where('academic_session_enrolment_id', $currentSessionEnrolment->id)
                ->pluck('unit_id');

            $courseCurriculumIds = CourseCurriculum::query()
                ->where('course_id', $courseEnrolment?->courseCurriculum?->course_id)
                ->when($courseEnrolment?->courseCurriculum?->curriculum_id, fn ($query, $curriculumId) => $query->where('curriculum_id', $curriculumId))
                ->where('is_active', true)
                ->pluck('id');

            $availableUnits = Unit::query()
                ->whereIn('course_curriculum_id', $courseCurriculumIds)
                ->where('is_active', true)
                ->where(function ($query) use ($currentSessionEnrolment) {
                    $query->where('modules_taught', $currentSessionEnrolment->module)
                        ->orWhereNull('modules_taught');
                })
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'modules_taught'])
                ->map(fn (Unit $unit) => [
                    'id' => $unit->id,
                    'code' => $unit->code,
                    'name' => $unit->name,
                    'module' => $unit->modules_taught,
                    'registered' => $registeredUnitIds->contains($unit->id),
                ])
                ->values();
        }

        return response()->json([
            'status_code' => 200,
            'data' => [
                'student' => [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'first_name' => $student->user->first_name,
                    'last_name' => $student->user->last_name,
                    'name' => trim($student->user->first_name . ' ' . $student->user->last_name),
                ],
                'finance' => [
                    'outstanding_balance' => $outstandingBalance,
                    'total_paid' => $totalPaid,
                    'next_due_date' => $nextDueInvoice?->due_date?->format('Y-m-d'),
                ],
                'course' => $course ? [
                    'id' => $course->id,
                    'code' => $course->code,
                    'name' => $course->name,
                    'duration' => $course->duration_label,
                    'level' => $course->level?->name,
                    'curriculum' => $courseEnrolment?->courseCurriculum?->curriculum ? [
                        'id' => $courseEnrolment->courseCurriculum->curriculum->id,
                        'code' => $courseEnrolment->courseCurriculum->curriculum->code,
                        'name' => $courseEnrolment->courseCurriculum->curriculum->name,
                    ] : null,
                ] : null,
                'enrolment' => $courseEnrolment ? [
                    'id' => $courseEnrolment->id,
                    'status' => $courseEnrolment->status,
                    'enrolment_date' => $courseEnrolment->enrolment_date,
                    'academic_session' => $currentSessionEnrolment?->academicSession ? [
                        'id' => $currentSessionEnrolment->academicSession->id,
                        'name' => $currentSessionEnrolment->academicSession->name,
                    ] : null,
                    'curriculum' => $courseEnrolment->courseCurriculum?->curriculum ? [
                        'id' => $courseEnrolment->courseCurriculum->curriculum->id,
                        'code' => $courseEnrolment->courseCurriculum->curriculum->code,
                        'name' => $courseEnrolment->courseCurriculum->curriculum->name,
                    ] : null,
                ] : null,
                'current_session' => $currentSession ? [
                    'id' => $currentSession->id,
                    'name' => $currentSession->name,
                ] : null,
                'needs_session_enrolment' => $needsSessionEnrolment,
                'last_session_enrolment' => $displaySessionEnrolment ? [
                    'id' => $displaySessionEnrolment->id,
                    'academic_session_id' => $displaySessionEnrolment->academic_session_id,
                    'session_name' => $displaySessionEnrolment->academicSession?->name,
                    'session_active' => $displaySessionEnrolment->academicSession?->is_active ?? false,
                    'year_of_study' => $displaySessionEnrolment->year_of_study,
                    'session_number' => $displaySessionEnrolment->session_number,
                    'module' => $displaySessionEnrolment->module,
                    'enrolled_at' => $displaySessionEnrolment->enrolled_at,
                ] : null,
                'available_units' => $availableUnits,
                'registered_unit_ids' => $registeredUnitIds->values(),

                'progress' => AcademicSessionEnrolment::currentProgress($student),

                'fee_template' => $courseInvoiceTemplate ? [
                    'id' => $courseInvoiceTemplate->id,
                    'code' => $courseInvoiceTemplate->feeTemplate->code,
                    'name' => $courseInvoiceTemplate->feeTemplate->name,
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

