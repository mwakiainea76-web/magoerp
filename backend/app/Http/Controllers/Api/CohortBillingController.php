<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\CourseCurriculum;
use App\Models\CurriculumFeeAssignment;
use App\Models\CourseEnrolment;
use App\Models\FeeTemplate;
use App\Models\Student;
use App\Models\Invoice;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CohortBillingController extends Controller
{
    protected BillingService $billingService;

    public function __construct(BillingService $billingService)
    {
        $this->billingService = $billingService;
    }

    /**
     * Preview cohort billing (dry run - no invoices created).
     */
    public function preview(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $validated = $request->validate([
            'academic_session_id' => ['required', 'uuid', Rule::exists('academic_sessions', 'id')],
            'course_curriculum_id' => ['required', 'uuid', Rule::exists('course_curricula', 'id')],
            'year_level' => ['required', 'integer', 'min:1', 'max:4'],
        ]);

        $session = AcademicSession::findOrFail($validated['academic_session_id']);
        $curriculum = CourseCurriculum::with('course')->findOrFail($validated['course_curriculum_id']);

        // Find fee structure
        $assignment = CurriculumFeeAssignment::where('course_curriculum_id', $validated['course_curriculum_id'])
            ->where('academic_session_id', $session->id)
            ->where('year_level', $validated['year_level'])
            ->where('dormant', false)
            ->where('is_approved', true)
            ->with('feeTemplate.items')
            ->first();

        if (!$assignment) {
            // Try per_year parent
            $assignment = CurriculumFeeAssignment::where('course_curriculum_id', $validated['course_curriculum_id'])
                ->whereNull('academic_session_id')
                ->where('year_level', $validated['year_level'])
                ->where('issuance_type', 'per_year')
                ->where('dormant', false)
                ->where('is_approved', true)
                ->with('feeTemplate.items')
                ->first();
        }

        // Find students
        $students = CourseEnrolment::where('course_curriculum_id', $validated['course_curriculum_id'])
            ->where('status', 'enrolled')
            ->where('year_of_study', $validated['year_level'])
            ->with('student.user')
            ->get();

        $totalStudents = $students->count();
        $alreadyBilled = 0;
        $noFeeStructure = $assignment ? 0 : $totalStudents;
        $willGenerate = 0;
        $totalAmount = 0;
        $skipped = [];

        if ($assignment) {
            $template = $assignment->feeTemplate;
            $amountPerStudent = (float) ($template?->items()->where('is_active', true)->sum('amount') ?? 0);

            foreach ($students as $enrolment) {
                $existingInvoice = Invoice::where('student_id', $enrolment->student_id)
                    ->where('academic_session_id', $session->id)
                    ->where('fee_template_id', $template?->id)
                    ->exists();

                if ($existingInvoice) {
                    $alreadyBilled++;
                    $skipped[] = [
                        'student_id' => $enrolment->student_id,
                        'name' => trim("{$enrolment->student?->user?->first_name} {$enrolment->student?->user?->last_name}"),
                        'reason' => 'Already billed',
                    ];
                    continue;
                }

                $willGenerate++;
                $totalAmount += $amountPerStudent;
            }
        }

        return response()->json([
            'data' => [
                'academic_session' => $session->name,
                'programme' => $curriculum->course?->name,
                'year_level' => $validated['year_level'],
                'total_students' => $totalStudents,
                'already_billed' => $alreadyBilled,
                'missing_fee_structure' => $noFeeStructure,
                'will_generate' => $willGenerate,
                'total_amount' => round($totalAmount, 2),
                'has_fee_structure' => $assignment !== null,
                'fee_structure_name' => $assignment?->feeTemplate?->name,
                'skipped' => $skipped,
            ],
        ]);
    }

    /**
     * Generate invoices for cohort (background job simulation).
     */
    public function generate(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        $validated = $request->validate([
            'academic_session_id' => ['required', 'uuid', Rule::exists('academic_sessions', 'id')],
            'course_curriculum_id' => ['required', 'uuid', Rule::exists('course_curricula', 'id')],
            'year_level' => ['required', 'integer', 'min:1', 'max:4'],
        ]);

        $session = AcademicSession::findOrFail($validated['academic_session_id']);

        $enrolments = CourseEnrolment::where('course_curriculum_id', $validated['course_curriculum_id'])
            ->where('status', 'enrolled')
            ->where('year_of_study', $validated['year_level'])
            ->with('student')
            ->get();

        $generated = 0;
        $failed = 0;
        $errors = [];

        foreach ($enrolments as $enrolment) {
            try {
                $existing = Invoice::where('student_id', $enrolment->student_id)
                    ->where('academic_session_id', $session->id)
                    ->exists();

                if ($existing) {
                    continue;
                }

                $this->billingService->createInvoiceForStudent(
                    $enrolment->student,
                    $request->user()->id,
                    $session
                );
                $generated++;
            } catch (\Exception $e) {
                $failed++;
                $errors[] = [
                    'student' => $enrolment->student?->admission_number,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'message' => "Generated {$generated} invoice(s). {$failed} failed.",
            'data' => [
                'generated' => $generated,
                'failed' => $failed,
                'errors' => $errors,
                'total_attempted' => $enrolments->count(),
            ],
        ]);
    }
}
