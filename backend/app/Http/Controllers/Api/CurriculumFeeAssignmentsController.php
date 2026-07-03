<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\AcademicYear;
use App\Models\CurriculumFeeAssignment;
use App\Models\FeeTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CurriculumFeeAssignmentsController extends Controller
{
    use PaginationMeta;

    public function index(Request $request, FeeTemplate $fee_template): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $query = CurriculumFeeAssignment::query()
            ->where('fee_template_id', $fee_template->id)
            ->whereNull('parent_assignment_id')
            ->with($this->loadRelations());

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->whereHas('courseCurriculum.course', fn ($cq) => $cq->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like))
                  ->orWhereHas('courseCurriculum.curriculum', fn ($cq) => $cq->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like))
                  ->orWhereHas('department', fn ($dq) => $dq->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like));
            });
        }

        $assignments = $query
            ->orderBy('year_level')
            ->orderBy('session_number')
            ->paginate($perPage)
            ->withQueryString();

        $collection = $assignments->getCollection()
            ->map(fn (CurriculumFeeAssignment $assignment) => $this->transform($assignment))
            ->values();

        $hasItems = $collection->isNotEmpty()
            || CurriculumFeeAssignment::query()
                ->where('fee_template_id', $fee_template->id)
                ->whereNull('parent_assignment_id')
                ->exists();

        return response()->json([
            'status_code' => 200,
            'data' => $collection,
            'meta' => $this->paginationMeta($assignments, ['q' => $search]),
            'fee_template_name' => $fee_template->name,
            'fee_template_code' => $fee_template->code,
            'fee_template_is_issued' => $fee_template->is_issued,
            'fee_template_is_assigned' => $hasItems,
            'fee_template_is_locked' => $fee_template->is_issued || $hasItems,
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

        $request->mergeIfMissing([
            'assignment_scope' => $request->filled('department_id') ? 'department' : 'course',
        ]);

        $validated = $request->validate([
            'assignment_scope' => ['required', Rule::in(['course', 'department'])],
            'course_curriculum_id' => ['required_if:assignment_scope,course', 'nullable', 'uuid', Rule::exists('course_curricula', 'id')],
            'department_id' => ['required_if:assignment_scope,department', 'nullable', 'uuid', Rule::exists('departments', 'id')],
            'academic_year_id' => ['required', 'uuid', Rule::exists('academic_years', 'id')],
            'year_level' => ['required', 'integer', 'min:0', 'max:4'],
            'is_approved' => ['sometimes', 'boolean'],
            'split_ratios' => ['nullable', 'array'],
            'split_ratios.*' => ['numeric', 'min:0.01', 'max:100'],
        ]);

        return $this->createPerYearAssignments($request, $fee_template, $validated);
    }

    private function createPerYearAssignments(Request $request, FeeTemplate $template, array $validated): JsonResponse
    {
        $academicYear = AcademicYear::findOrFail($validated['academic_year_id']);
        $sessions = $academicYear->sessions()->orderBy('start_date')->orderBy('code')->get();

        if ($sessions->isEmpty()) {
            return response()->json([
                'message' => 'The selected academic year has no sessions to receive the yearly fee.',
            ], 422);
        }

        $existing = CurriculumFeeAssignment::query()
            ->whereNull('parent_assignment_id')
            ->where('issuance_type', 'per_year')
            ->where(function ($query) use ($validated) {
                $validated['assignment_scope'] === 'department'
                    ? $query->where('department_id', $validated['department_id'])->whereNull('course_curriculum_id')
                    : $query->where('course_curriculum_id', $validated['course_curriculum_id'])->whereNull('department_id');
            })
            ->where('year_level', $validated['year_level'])
            ->whereHas('childAssignments.academicSession', fn ($query) => $query
                ->where('academic_year_id', $academicYear->id))
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
                'course_curriculum_id' => $validated['assignment_scope'] === 'course' ? $validated['course_curriculum_id'] : null,
                'department_id' => $validated['assignment_scope'] === 'department' ? $validated['department_id'] : null,
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
                    'course_curriculum_id' => $validated['assignment_scope'] === 'course' ? $validated['course_curriculum_id'] : null,
                    'department_id' => $validated['assignment_scope'] === 'department' ? $validated['department_id'] : null,
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

    public function search(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));
        $academicYearId = $request->string('academic_year_id', '');
        $academicSessionId = $request->string('academic_session_id', '');

        $query = CurriculumFeeAssignment::query()
            ->whereNull('parent_assignment_id')
            ->where('issuance_type', 'per_year')
            ->with(array_merge($this->loadRelations(), ['feeTemplate:id,code,name']));

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->whereHas('courseCurriculum.course', fn ($cq) => $cq->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like))
                  ->orWhereHas('courseCurriculum.curriculum', fn ($cq) => $cq->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like))
                  ->orWhereHas('department', fn ($dq) => $dq->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like))
                  ->orWhereHas('feeTemplate', fn ($fq) => $fq->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like));
            });
        }

        if ($academicYearId !== '') {
            $query->where(function ($q) use ($academicYearId) {
                $q->whereHas('childAssignments.academicSession', fn ($cq) => $cq
                    ->where('academic_year_id', $academicYearId));
            });
        }

        if ($academicSessionId !== '') {
            $query->whereHas('childAssignments', fn ($q) => $q
                ->where('academic_session_id', $academicSessionId));
        }

        $assignments = $query
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        $collection = $assignments->getCollection()
            ->map(fn (CurriculumFeeAssignment $assignment) => $this->transform($assignment))
            ->values();

        return response()->json([
            'status_code' => 200,
            'data' => $collection,
            'meta' => $this->paginationMeta($assignments, ['q' => $search, 'academic_year_id' => $academicYearId, 'academic_session_id' => $academicSessionId]),
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
        $department = $assignment->department;

        return [
            'id' => $assignment->id,
            'assignment_scope' => $assignment->department_id ? 'department' : 'course',
            'course_curriculum_id' => $assignment->course_curriculum_id,
            'department_id' => $assignment->department_id,
            'department_name' => $department?->name,
            'course_code' => $mapping?->course?->code,
            'course_name' => $mapping?->course?->name,
            'assignment_target_name' => $department?->name ?? $mapping?->course?->name,
            'fee_template_id' => $assignment->fee_template_id,
            'fee_template_name' => $assignment->feeTemplate?->name,
            'course_curriculum_name' => $mapping?->curriculum
                ? trim($mapping->curriculum->code.' '.$mapping->curriculum->name)
                : null,
            'course_level_name' => $mapping?->course?->level?->name,
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
            'department:id,code,name',
            'courseCurriculum.course.level:id,name',
            'courseCurriculum.course:id,code,name,certification_level_id',
            'courseCurriculum.curriculum:id,code,name',
            'childAssignments.academicSession:id,name,code,academic_year_id',
        ];
    }
}
