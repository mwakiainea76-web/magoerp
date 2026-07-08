<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CourseEnrolment;
use App\Models\CourseCurriculum;
use App\Models\CurriculumFeeAssignment;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\StudentLedgerEntry;
use App\Models\SystemConfiguration;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

use App\Http\Controllers\Api\Traits\BalanceExpression;

class StudentDashboardController extends Controller
{
    use BalanceExpression;
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
                ->whereHas('year', fn ($query) => $query->where('is_active', true))
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

        $courseCurriculumId = $courseEnrolment?->course_curriculum_id;
        $priorSessionCount = AcademicSessionEnrolment::where('student_id', $student->id)->count();
        $sessionsPerYear = (int) SystemConfiguration::getValue('sessions_per_academic_year', config('academic.sessions_per_academic_year', 3));
        $nextModule = $priorSessionCount + 1;
        $nextYearLevel = (int) floor(($nextModule - 1) / $sessionsPerYear) + 1;
        $nextSessionNumber = (($nextModule - 1) % $sessionsPerYear) + 1;
        $pendingFeeAssignment = null;
        $courseInvoiceTemplate = null;
        $invoiceTemplateItems = [];
        $totalFee = 0;

        if ($course && $currentSession && $currentSessionEnrolment) {
            $courseInvoiceTemplate = $courseCurriculumId
                ? CurriculumFeeAssignment::query()
                    ->where(function ($query) use ($courseCurriculumId, $course) {
                        $query->where('course_curriculum_id', $courseCurriculumId);
                        if ($course?->department_id) {
                            $query->orWhere(function ($departmentQuery) use ($course) {
                                $departmentQuery->where('department_id', $course->department_id)
                                    ->whereNull('course_curriculum_id');
                            });
                        }
                    })
                    ->where('is_approved', true)
                    ->whereIn('year_level', [$currentSessionEnrolment->year_of_study, CurriculumFeeAssignment::ALL_YEAR_LEVELS])
                    ->where('session_number', $currentSessionEnrolment->session_number)
                    ->where(function ($query) use ($currentSession) {
                        $query->where('academic_session_id', $currentSession->id)
                            ->orWhereNull('academic_session_id')
                            ->orWhereHas('academicSession', fn ($sessionQuery) => $sessionQuery
                                ->where('academic_year_id', $currentSession->academic_year_id));
                    })
                    ->with(['feeTemplate.items' => fn ($query) => $query->where('is_active', true)])
                    ->orderByRaw('course_curriculum_id = ? desc', [$courseCurriculumId])
                    ->orderByRaw('CASE WHEN year_level = ? THEN 0 ELSE 1 END', [$currentSessionEnrolment->year_of_study])
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

        if ($user->can('finance.view') && $courseCurriculumId && $course && $currentSession && !$currentSessionEnrolment) {
            $pendingFeeAssignment = CurriculumFeeAssignment::query()
                ->where(function ($query) use ($courseCurriculumId, $course) {
                    $query->where('course_curriculum_id', $courseCurriculumId);
                    if ($course?->department_id) {
                        $query->orWhere(function ($departmentQuery) use ($course) {
                            $departmentQuery->where('department_id', $course->department_id)
                                ->whereNull('course_curriculum_id');
                        });
                    }
                })
                ->where(function ($query) use ($currentSession) {
                    $query->where('academic_session_id', $currentSession->id)
                        ->orWhereNull('academic_session_id')
                        ->orWhereHas('academicSession', fn ($sessionQuery) => $sessionQuery
                            ->where('academic_year_id', $currentSession->academic_year_id));
                })
                ->whereIn('year_level', [$nextYearLevel, CurriculumFeeAssignment::ALL_YEAR_LEVELS])
                ->where('session_number', $nextSessionNumber)
                ->where('is_approved', false)
                ->with(['feeTemplate:id,code,name', 'department:id,name', 'courseCurriculum.course:id,name'])
                ->orderByRaw('course_curriculum_id = ? desc', [$courseCurriculumId])
                ->orderByRaw('CASE WHEN year_level = ? THEN 0 ELSE 1 END', [$nextYearLevel])
                ->orderByRaw('academic_session_id = ? desc', [$currentSession->id])
                ->first();
        }

        $invoiceBaseQuery = Invoice::query()
            ->where('student_id', $student->id)
            ->where('status', '!=', 'cancelled')
            ->select('invoices.*')
            ->selectRaw('COALESCE((SELECT SUM(amount) FROM invoice_payment_allocations WHERE invoice_id = invoices.id), 0) as paid_amount')
            ->selectRaw("CASE WHEN ({$this->balanceExpression()}) > 0 THEN ({$this->balanceExpression()}) ELSE 0 END as balance_due");

        $invoices = $invoiceBaseQuery->get();
        $outstandingBalance = (float) $invoices->where('balance_due', '>', 0)->sum('balance_due');
        $totalAdjustments = (float) \App\Models\StudentFeeAdjustment::query()
            ->whereHas('invoice', fn ($q) => $q->where('student_id', $student->id))
            ->whereNull('deleted_at')
            ->selectRaw("{$this->adjustmentExpression()} as total")
            ->value('total');

        $payments = Payment::query()
            ->where('student_id', $student->id)
            ->where('status', 'completed')
            ->withSum('allocations', 'amount')
            ->get();
        $totalPaid = (float) $payments->sum('amount');
        $unallocatedCredit = (float) $payments->sum(
            fn (Payment $payment) => max(0, (float) $payment->amount - (float) ($payment->allocations_sum_amount ?? 0)),
        );
        $totalRefunded = Schema::hasTable('refunds')
            ? (float) Refund::query()
                ->where('student_id', $student->id)
                ->where('status', 'processed')
                ->sum('amount')
            : 0.0;
        $netBalance = $outstandingBalance - $unallocatedCredit + $totalRefunded;

        $nextDueInvoice = $invoices
            ->where('balance_due', '>', 0)
            ->sortBy('due_date')
            ->first();

        $overdueCount = $invoices
            ->where('balance_due', '>', 0)
            ->where('due_date', '<', now()->toDateString())
            ->count();
        $overdueTotal = (float) $invoices
            ->where('balance_due', '>', 0)
            ->where('due_date', '<', now()->toDateString())
            ->sum('balance_due');

        $dormantFeesCount = 0;

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
                    'net_balance' => $netBalance,
                    'total_paid' => $totalPaid,
                    'total_adjustments' => $totalAdjustments,
                    'unallocated_credit' => $unallocatedCredit,
                    'next_due_date' => $nextDueInvoice?->due_date?->format('Y-m-d'),
                    'overdue_count' => $overdueCount,
                    'overdue_total' => $overdueTotal,
                    'dormant_fees_count' => $dormantFeesCount,
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
                'pending_fee_assignment' => $pendingFeeAssignment ? [
                    'id' => $pendingFeeAssignment->id,
                    'fee_template_id' => $pendingFeeAssignment->fee_template_id,
                    'fee_template_name' => $pendingFeeAssignment->feeTemplate?->name,
                    'assignment_target_name' => $pendingFeeAssignment->department?->name ?? $pendingFeeAssignment->courseCurriculum?->course?->name,
                    'year_level' => $pendingFeeAssignment->year_level,
                    'session_number' => $pendingFeeAssignment->session_number,
                    'can_activate' => $user->can('finance.update'),
                ] : null,
            ],
        ]);
    }
}
