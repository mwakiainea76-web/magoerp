<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CurriculumFeeAssignment;
use App\Models\FeeTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CurriculumFeeAssignmentsController extends Controller
{
    public function index(Request $request, FeeTemplate $fee_template): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $items = CurriculumFeeAssignment::query()
            ->where('fee_template_id', $fee_template->id)
            ->with([
                'academicSession:id,name,code',
                'courseCurriculum.course.level:id,name',
                'courseCurriculum.course:id,code,name,certification_level_id',
                'courseCurriculum.curriculum:id,code,name',
            ])
            ->orderBy('year_level')
            ->orderBy('session_number')
            ->get()
            ->map(fn (CurriculumFeeAssignment $cit) => $this->transform($cit))
            ->values();

        return response()->json([
            'status_code' => 200,
            'data' => $items,
            'fee_template_name' => $fee_template->name,
            'fee_template_code' => $fee_template->code,
            'fee_template_is_issued' => $fee_template->is_issued,
            'fee_template_is_assigned' => $items->isNotEmpty(),
            'fee_template_is_locked' => $fee_template->is_issued || $items->isNotEmpty(),
            'fee_template_total_amount' => (float) $fee_template->items()->where('is_active', true)->sum('amount'),
            'fee_template_total_items' => (int) $fee_template->items()->where('is_active', true)->count(),
        ], 200);
    }

    public function store(Request $request, FeeTemplate $fee_template): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        if ($fee_template->is_issued) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee template has already been issued. Assignments cannot be modified.',
            ], 422);
        }

        $validated = $request->validate([
            'course_curriculum_id' => ['nullable', 'uuid', Rule::exists('course_curricula', 'id')],
            'academic_session_id' => ['nullable', 'uuid', Rule::exists('academic_sessions', 'id')],
            'year_level' => ['required', 'integer', 'min:1', 'max:10'],
            'session_number' => ['required', 'integer', 'min:1', 'max:10'],
            'is_approved' => ['boolean'],
        ]);

        $existsQuery = CurriculumFeeAssignment::query()
            ->where('year_level', $validated['year_level'])
            ->where('session_number', $validated['session_number']);

        if ($validated['course_curriculum_id'] ?? null) {
            $existsQuery->where('course_curriculum_id', $validated['course_curriculum_id']);
        } else {
            $existsQuery->whereNull('course_curriculum_id');
        }

        $exists = $existsQuery->when(
            $validated['academic_session_id'] ?? null,
            fn ($query, $sessionId) => $query->where('academic_session_id', $sessionId),
            fn ($query) => $query->whereNull('academic_session_id'),
        )
        ->exists();

        if ($exists) {
            return response()->json([
                'status_code' => 409,
                'message' => 'This assignment already exists for the selected year and session.',
            ], 409);
        }

        $cit = CurriculumFeeAssignment::create([
            'course_curriculum_id' => $validated['course_curriculum_id'] ?? null,
            'fee_template_id' => $fee_template->id,
            'academic_session_id' => $validated['academic_session_id'] ?? null,
            'year_level' => $validated['year_level'],
            'session_number' => $validated['session_number'],
            'is_approved' => $request->boolean('is_approved', false),
            'approved_by' => $request->boolean('is_approved') ? $request->user()->id : null,
            'approved_at' => $request->boolean('is_approved') ? now() : null,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        if (!$fee_template->is_issued) {
            $fee_template->update(['is_issued' => true]);
        }

        $cit->load([
            'academicSession:id,name,code',
            'courseCurriculum.course.level:id,name',
            'courseCurriculum.course:id,code,name,certification_level_id',
            'courseCurriculum.curriculum:id,code,name',
        ]);

        return response()->json([
            'status_code' => 201,
            'message' => 'Course curriculum linked to fee template successfully.',
            'data' => $this->transform($cit),
        ], 201);
    }

    public function update(Request $request, FeeTemplate $fee_template, CurriculumFeeAssignment $curriculum_fee_assignment): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);
        abort_if($curriculum_fee_assignment->fee_template_id !== $fee_template->id, 404);

        if ($fee_template->is_issued) {
            return response()->json([
                'status_code' => 422,
                'message' => 'This fee template has already been issued. Assignments cannot be modified.',
            ], 422);
        }

        $validated = $request->validate([
            'is_approved' => ['required', 'boolean'],
        ]);

        $curriculum_fee_assignment->update([
            'is_approved' => $validated['is_approved'],
            'approved_by' => $validated['is_approved'] ? $request->user()->id : null,
            'approved_at' => $validated['is_approved'] ? now() : null,
            'updated_by' => $request->user()->id,
        ]);

        $curriculum_fee_assignment->load([
            'academicSession:id,name,code',
            'courseCurriculum.course.level:id,name',
            'courseCurriculum.course:id,code,name,certification_level_id',
            'courseCurriculum.curriculum:id,code,name',
        ]);

        return response()->json([
            'status_code' => 200,
            'message' => $validated['is_approved'] ? 'Fee template approved for this course.' : 'Fee template approval revoked.',
            'data' => $this->transform($curriculum_fee_assignment),
        ], 200);
    }

    public function destroy(Request $request, FeeTemplate $fee_template, CurriculumFeeAssignment $curriculum_fee_assignment): JsonResponse
    {
        abort_unless($request->user()?->can('finance.delete'), 403);
        abort_if($curriculum_fee_assignment->fee_template_id !== $fee_template->id, 404);

        return response()->json([
            'status_code' => 422,
            'message' => 'Fee template assignments cannot be deleted after assignment. Create a new template for changes.',
        ], 422);
    }

    private function transform(CurriculumFeeAssignment $cit): array
    {
        $cc = $cit->courseCurriculum;

        return [
            'id' => $cit->id,
            'course_curriculum_id' => $cit->course_curriculum_id,
            'course_code' => $cc?->course?->code,
            'course_name' => $cc?->course?->name,
            'course_curriculum_name' => $cc && $cc->curriculum
                ? trim($cc->curriculum->code . ' ' . $cc->curriculum->name)
                : null,
            'course_level_name' => $cc?->course?->level?->name,
            'academic_session_id' => $cit->academic_session_id,
            'academic_session_name' => $cit->academicSession?->name,
            'academic_session_code' => $cit->academicSession?->code,
            'year_level' => $cit->year_level,
            'session_number' => $cit->session_number,
            'is_approved' => $cit->is_approved,
            'approved_at' => $cit->approved_at,
        ];
    }
}
