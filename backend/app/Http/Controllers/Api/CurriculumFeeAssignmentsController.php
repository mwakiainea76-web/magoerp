<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\CurriculumFeeAssignment;
use App\Models\FeeTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CurriculumFeeAssignmentsController extends Controller
{
    public function index(Request $request, FeeTemplate $fee_template): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $items = CurriculumFeeAssignment::query()
            ->where('fee_template_id', $fee_template->id)
            ->whereNull('parent_assignment_id')
            ->with($this->loadRelations())
            ->orderBy('year_level')
            ->orderBy('session_number')
            ->get()
            ->map(fn (CurriculumFeeAssignment $assignment) => $this->transform($assignment))
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
        ]);
    }

    public function store(Request $request, FeeTemplate $fee_template): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        if ($fee_template->is_issued) {
            return response()->json([
                'message' => 'This fee template has already been used for invoicing and cannot receive new assignments.',
            ], 422);
        }

        $request->mergeIfMissing(['issuance_type' => 'per_session']);

        $validated = $request->validate([
            'course_curriculum_id' => ['required', 'uuid', Rule::exists('course_curricula', 'id')],
            'academic_session_id' => ['required', 'uuid', Rule::exists('academic_sessions', 'id')],
            'year_level' => ['required', 'integer', 'min:1', 'max:10'],
            'session_number' => ['required_if:issuance_type,per_session', 'nullable', 'integer', 'min:1', 'max:10'],
            'is_approved' => ['sometimes', 'boolean'],
            'issuance_type' => ['required', Rule::in(['per_session', 'per_year'])],
            'split_ratios' => ['nullable', 'array'],
            'split_ratios.*' => ['numeric', 'min:0.01', 'max:100'],
        ]);

        return $validated['issuance_type'] === 'per_year'
            ? $this->createPerYearAssignments($request, $fee_template, $validated)
            : $this->createPerSessionAssignment($request, $fee_template, $validated);
    }

    private function createPerSessionAssignment(Request $request, FeeTemplate $template, array $validated): JsonResponse
    {
        $exists = CurriculumFeeAssignment::query()
            ->where('issuance_type', 'per_session')
            ->where('course_curriculum_id', $validated['course_curriculum_id'])
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('year_level', $validated['year_level'])
            ->where('session_number', $validated['session_number'])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'This session fee assignment already exists.'], 409);
        }

        $approved = $request->boolean('is_approved');
        $assignment = CurriculumFeeAssignment::create([
            'course_curriculum_id' => $validated['course_curriculum_id'],
            'fee_template_id' => $template->id,
            'academic_session_id' => $validated['academic_session_id'],
            'issuance_type' => 'per_session',
            'parent_assignment_id' => null,
            'dormant' => false,
            'split_amount' => null,
            'split_ratio' => null,
            'year_level' => $validated['year_level'],
            'session_number' => $validated['session_number'],
            'is_approved' => $approved,
            'approved_by' => $approved ? $request->user()->id : null,
            'approved_at' => $approved ? now() : null,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Per-session fee assignment created successfully.',
            'data' => $this->transform($assignment->load($this->loadRelations())),
        ], 201);
    }

    private function createPerYearAssignments(Request $request, FeeTemplate $template, array $validated): JsonResponse
    {
        $referenceSession = AcademicSession::with('year.sessions')->findOrFail($validated['academic_session_id']);
        $sessions = $referenceSession->year->sessions()->orderBy('start_date')->orderBy('code')->get();

        if ($sessions->isEmpty() || $sessions->first()->id !== $referenceSession->id) {
            return response()->json([
                'message' => 'A yearly fee must be issued against the first session of the academic year.',
            ], 422);
        }

        $existing = CurriculumFeeAssignment::query()
            ->whereNull('parent_assignment_id')
            ->where('issuance_type', 'per_year')
            ->where('course_curriculum_id', $validated['course_curriculum_id'])
            ->where('year_level', $validated['year_level'])
            ->whereHas('childAssignments.academicSession', fn ($query) => $query
                ->where('academic_year_id', $referenceSession->academic_year_id))
            ->exists();

        if ($existing) {
            return response()->json(['message' => 'A yearly fee assignment already exists for this course and academic year.'], 409);
        }

        $totalAmount = (float) $template->items()->where('is_active', true)->sum('amount');
        if ($totalAmount <= 0) {
            return response()->json(['message' => 'The fee template must contain positive active fee items.'], 422);
        }

        $hasCustomRatios = isset($validated['split_ratios']);
        $ratios = $validated['split_ratios'] ?? $this->equalRatios($sessions->count());
        if (count($ratios) !== $sessions->count() || abs(array_sum($ratios) - 100) > 0.01) {
            return response()->json([
                'message' => 'Split ratios must provide one value per session and total exactly 100%.',
            ], 422);
        }

        $approved = $request->boolean('is_approved');
        $parent = DB::transaction(function () use ($request, $template, $validated, $sessions, $ratios, $totalAmount, $approved, $hasCustomRatios) {
            $parent = CurriculumFeeAssignment::create([
                'course_curriculum_id' => $validated['course_curriculum_id'],
                'fee_template_id' => $template->id,
                'academic_session_id' => null,
                'issuance_type' => 'per_year',
                'parent_assignment_id' => null,
                'dormant' => true,
                'split_amount' => $totalAmount,
                'split_ratio' => 100,
                'year_level' => $validated['year_level'],
                'session_number' => 0,
                'is_approved' => $approved,
                'approved_by' => $approved ? $request->user()->id : null,
                'approved_at' => $approved ? now() : null,
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            $allocated = 0.0;
            foreach ($sessions as $index => $session) {
                $amount = $index === $sessions->count() - 1
                    ? round($totalAmount - $allocated, 2)
                    : round($hasCustomRatios
                        ? $totalAmount * (float) $ratios[$index] / 100
                        : $totalAmount / $sessions->count(), 2);
                $allocated += $amount;
                $ratio = $hasCustomRatios
                    ? (float) $ratios[$index]
                    : round($amount / $totalAmount * 100, 2);

                CurriculumFeeAssignment::create([
                    'course_curriculum_id' => $validated['course_curriculum_id'],
                    'fee_template_id' => $template->id,
                    'academic_session_id' => $session->id,
                    'issuance_type' => 'per_year',
                    'parent_assignment_id' => $parent->id,
                    'dormant' => !$session->is_active,
                    'split_amount' => $amount,
                    'split_ratio' => $ratio,
                    'year_level' => $validated['year_level'],
                    'session_number' => $index + 1,
                    'is_approved' => $approved,
                    'approved_by' => $approved ? $request->user()->id : null,
                    'approved_at' => $approved ? now() : null,
                    'created_by' => $request->user()->id,
                    'updated_by' => $request->user()->id,
                ]);
            }

            return $parent;
        });

        return response()->json([
            'message' => 'Yearly fee assignment created and split across '.$sessions->count().' sessions.',
            'data' => $this->transform($parent->load($this->loadRelations())),
        ], 201);
    }

    public function update(Request $request, FeeTemplate $fee_template, CurriculumFeeAssignment $curriculum_fee_assignment): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);
        abort_if($curriculum_fee_assignment->fee_template_id !== $fee_template->id, 404);

        if ($curriculum_fee_assignment->parent_assignment_id && $curriculum_fee_assignment->dormant) {
            return $this->updateDormantPortion($request, $curriculum_fee_assignment);
        }

        $validated = $request->validate(['is_approved' => ['required', 'boolean']]);
        $approved = (bool) $validated['is_approved'];
        $values = [
            'is_approved' => $approved,
            'approved_by' => $approved ? $request->user()->id : null,
            'approved_at' => $approved ? now() : null,
            'updated_by' => $request->user()->id,
        ];

        DB::transaction(function () use ($curriculum_fee_assignment, $values) {
            $curriculum_fee_assignment->update($values);
            if ($curriculum_fee_assignment->issuance_type === 'per_year' && !$curriculum_fee_assignment->parent_assignment_id) {
                $curriculum_fee_assignment->childAssignments()->update($values);
            }
        });

        return response()->json([
            'message' => $approved ? 'Fee assignment approved.' : 'Fee assignment approval revoked.',
            'data' => $this->transform($curriculum_fee_assignment->fresh()->load($this->loadRelations())),
        ]);
    }

    private function updateDormantPortion(Request $request, CurriculumFeeAssignment $portion): JsonResponse
    {
        $validated = $request->validate([
            'split_amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        $newAmount = round((float) $validated['split_amount'], 2);
        $oldAmount = (float) $portion->split_amount;
        $delta = round($newAmount - $oldAmount, 2);

        if (abs($delta) < 0.01) {
            return response()->json(['message' => 'The dormant portion amount has not changed.'], 422);
        }

        $sibling = CurriculumFeeAssignment::query()
            ->where('parent_assignment_id', $portion->parent_assignment_id)
            ->where('id', '!=', $portion->id)
            ->where('dormant', true)
            ->orderByDesc('session_number')
            ->first();

        if (!$sibling || (float) $sibling->split_amount - $delta <= 0) {
            return response()->json([
                'message' => 'This change cannot preserve the annual total using the remaining dormant portions.',
            ], 422);
        }

        $parent = $portion->parentAssignment()->firstOrFail();
        $siblingOld = (float) $sibling->split_amount;
        $siblingNew = round($siblingOld - $delta, 2);
        $parentTotal = (float) $parent->split_amount;

        DB::transaction(function () use ($request, $portion, $sibling, $newAmount, $oldAmount, $siblingOld, $siblingNew, $parentTotal, $validated) {
            $portion->update([
                'split_amount' => $newAmount,
                'split_ratio' => round($newAmount / $parentTotal * 100, 2),
                'updated_by' => $request->user()->id,
            ]);
            $sibling->update([
                'split_amount' => $siblingNew,
                'split_ratio' => round($siblingNew / $parentTotal * 100, 2),
                'updated_by' => $request->user()->id,
            ]);

            foreach ([[$portion, $oldAmount, $newAmount], [$sibling, $siblingOld, $siblingNew]] as [$assignment, $old, $new]) {
                $assignment->audits()->create([
                    'modified_by' => $request->user()->id,
                    'field' => 'split_amount',
                    'old_value' => $old,
                    'new_value' => $new,
                    'reason' => $validated['reason'],
                ]);
            }
        });

        return response()->json([
            'message' => 'Dormant fee portions rebalanced successfully without changing the annual total.',
            'data' => $this->transform($parent->fresh()->load($this->loadRelations())),
        ]);
    }

    public function destroy(Request $request, FeeTemplate $fee_template, CurriculumFeeAssignment $curriculum_fee_assignment): JsonResponse
    {
        abort_unless($request->user()?->can('finance.delete'), 403);
        abort_if($curriculum_fee_assignment->fee_template_id !== $fee_template->id, 404);

        return response()->json([
            'message' => 'Fee assignments cannot be deleted after creation. Create a replacement template instead.',
        ], 422);
    }

    private function equalRatios(int $count): array
    {
        $ratios = [];
        $allocated = 0.0;
        for ($index = 0; $index < $count; $index++) {
            $ratio = $index === $count - 1
                ? round(100 - $allocated, 2)
                : round(100 / $count, 2);
            $ratios[] = $ratio;
            $allocated += $ratio;
        }

        return $ratios;
    }

    private function transform(CurriculumFeeAssignment $assignment): array
    {
        $mapping = $assignment->courseCurriculum;

        return [
            'id' => $assignment->id,
            'course_curriculum_id' => $assignment->course_curriculum_id,
            'course_code' => $mapping?->course?->code,
            'course_name' => $mapping?->course?->name,
            'course_curriculum_name' => $mapping?->curriculum
                ? trim($mapping->curriculum->code.' '.$mapping->curriculum->name)
                : null,
            'course_level_name' => $mapping?->course?->level?->name,
            'academic_session_id' => $assignment->academic_session_id,
            'academic_session_name' => $assignment->academicSession?->name,
            'academic_session_code' => $assignment->academicSession?->code,
            'issuance_type' => $assignment->issuance_type,
            'parent_assignment_id' => $assignment->parent_assignment_id,
            'dormant' => (bool) $assignment->dormant,
            'split_amount' => $assignment->split_amount !== null ? (float) $assignment->split_amount : null,
            'split_ratio' => $assignment->split_ratio !== null ? (float) $assignment->split_ratio : null,
            'year_level' => $assignment->year_level,
            'session_number' => $assignment->session_number,
            'is_approved' => (bool) $assignment->is_approved,
            'approved_at' => $assignment->approved_at,
            'child_assignments' => $assignment->relationLoaded('childAssignments')
                ? $assignment->childAssignments->map(fn (CurriculumFeeAssignment $child) => [
                    'id' => $child->id,
                    'academic_session_id' => $child->academic_session_id,
                    'academic_session_name' => $child->academicSession?->name,
                    'academic_session_code' => $child->academicSession?->code,
                    'session_number' => $child->session_number,
                    'dormant' => (bool) $child->dormant,
                    'split_amount' => (float) $child->split_amount,
                    'split_ratio' => (float) $child->split_ratio,
                    'is_approved' => (bool) $child->is_approved,
                ])->values()
                : [],
        ];
    }

    private function loadRelations(): array
    {
        return [
            'academicSession:id,name,code,academic_year_id',
            'courseCurriculum.course.level:id,name',
            'courseCurriculum.course:id,code,name,certification_level_id',
            'courseCurriculum.curriculum:id,code,name',
            'childAssignments.academicSession:id,name,code,academic_year_id',
        ];
    }
}
