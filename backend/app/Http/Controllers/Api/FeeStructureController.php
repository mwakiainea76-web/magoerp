<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\AcademicSession;
use App\Models\CourseCurriculum;
use App\Models\CurriculumFeeStructure;
use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FeeStructureController extends Controller
{
    use PaginationMeta;

    /**
     * List fee structures (FeeStructures) with version info.
     */
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));
        $courseCurriculumId = (string) $request->string('course_curriculum_id', '');

        $query = FeeStructure::query()
            ->with(['items' => fn($q) => $q->where('is_active', true)])
            ->withCount('items as active_items_count');

        if ($courseCurriculumId !== '') {
            $query->whereHas('assignments', fn($q) => $q->where('course_curriculum_id', $courseCurriculumId));
        }

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                  ->orWhere('code', 'like', $like);
            });
        }

        $templates = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();

        $collection = $templates->getCollection()->map(function (FeeStructure $template) {
            $totalAmount = $template->items->sum('amount');
            $assignmentsCount = CurriculumFeeStructure::where('fee_structure_id', $template->id)
                ->whereNull('parent_assignment_id')->count();

            return [
                'id' => $template->id,
                'code' => $template->code,
                'name' => $template->name,
                'description' => $template->description,
                'total_amount' => (float) $totalAmount,
                'items_count' => $template->active_items_count,
                'assignments_count' => $assignmentsCount,
                'status' => $template->is_issued ? 'published' : ($template->is_active ? 'draft' : 'archived'),
                'is_active' => (bool) $template->is_active,
                'is_issued' => (bool) $template->is_issued,
                'created_at' => $template->created_at,
                'updated_at' => $template->updated_at,
            ];
        })->values();

        return response()->json([
            'status_code' => 200,
            'data' => $collection,
            'meta' => $this->paginationMeta($templates, ['q' => $search]),
        ]);
    }

    /**
     * Wizard: Create Fee Structure (template + items + assignments in one transaction).
     * Step 1: General Info, Step 2: Items, Step 3: Assignment Config, Step 4: Review & Save
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:fee_structures,code'],
            'description' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.amount' => ['required', 'numeric', 'min:0.01'],
            'items.*.description' => ['nullable', 'string', 'max:2000'],
            'action' => ['required', Rule::in(['draft', 'publish'])],
        ]);

        $userId = $request->user()->id;

        $template = FeeStructure::create([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'type' => 'academic',
            'is_active' => true,
            'is_issued' => $validated['action'] === 'publish',
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);

        foreach ($validated['items'] as $item) {
            FeeStructureItem::create([
                'fee_structure_id' => $template->id,
                'name' => $item['name'],
                'amount' => $item['amount'],
                'description' => $item['description'] ?? null,
                'is_active' => true,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);
        }

        return response()->json([
            'message' => $validated['action'] === 'publish'
                ? 'Fee structure published successfully.'
                : 'Fee structure saved as draft.',
            'data' => ['id' => $template->id, 'name' => $template->name, 'code' => $template->code],
        ], 201);
    }

    /**
     * Show fee structure details (used for cloning/editing).
     */
    public function show(Request $request, FeeStructure $fee_structure): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $fee_structure->load(['items' => fn($q) => $q->where('is_active', true)]);

        $assignment = CurriculumFeeStructure::where('fee_structure_id', $fee_structure->id)
            ->whereNull('parent_assignment_id')
            ->with(['courseCurriculum.course', 'courseCurriculum.curriculum', 'childAssignments.academicSession'])
            ->first();

        return response()->json([
            'status_code' => 200,
            'data' => [
                'id' => $fee_structure->id,
                'code' => $fee_structure->code,
                'name' => $fee_structure->name,
                'description' => $fee_structure->description,
                'is_issued' => (bool) $fee_structure->is_issued,
                'is_active' => (bool) $fee_structure->is_active,
                'items' => $fee_structure->items->map(fn($i) => [
                    'id' => $i->id,
                    'name' => $i->name,
                    'amount' => (float) $i->amount,
                    'description' => $i->description,
                ]),
                'assignment' => $assignment ? [
                    'id' => $assignment->id,
                    'course_curriculum_id' => $assignment->course_curriculum_id,
                    'course_name' => $assignment->courseCurriculum?->course?->name,
                    'curriculum_name' => $assignment->courseCurriculum?->curriculum?->name,
                    'department_id' => $assignment->department_id,
                    'academic_session_id' => $assignment->academic_session_id,
                    'issuance_type' => $assignment->issuance_type,
                    'year_level' => $assignment->year_level,
                    'session_number' => $assignment->session_number,
                    'is_approved' => (bool) $assignment->is_approved,
                    'child_assignments' => $assignment->childAssignments->map(fn($c) => [
                        'academic_session_id' => $c->academic_session_id,
                        'session_name' => $c->academicSession?->name,
                        'session_number' => $c->session_number,
                        'split_amount' => (float) $c->split_amount,
                        'split_ratio' => (float) $c->split_ratio,
                    ]),
                ] : null,
                'created_at' => $fee_structure->created_at,
                'updated_at' => $fee_structure->updated_at,
            ],
        ]);
    }

    /**
     * Clone a fee structure for a new session/programme/year.
     */
    public function clone(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        $validated = $request->validate([
            'source_fee_structure_id' => ['required', 'uuid', Rule::exists('fee_structures', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:fee_structures,code'],
            'academic_session_id' => ['required', 'uuid', Rule::exists('academic_sessions', 'id')],
            'assignment_scope' => ['required', Rule::in(['course', 'department', 'all'])],
            'course_curriculum_id' => ['required_if:assignment_scope,course', 'nullable', 'uuid', Rule::exists('course_curricula', 'id')],
            'department_id' => ['required_if:assignment_scope,department', 'nullable', 'uuid', Rule::exists('departments', 'id')],
            'year_level' => ['required', 'integer', 'min:0', 'max:4'],
            'issuance_type' => ['required', Rule::in(['per_session', 'per_year'])],
            'session_number' => ['required_if:issuance_type,per_session', 'nullable', 'integer', 'min:1', 'max:4'],
            'action' => ['required', Rule::in(['draft', 'publish'])],
        ]);

        $source = FeeStructure::with(['items' => fn($q) => $q->where('is_active', true)])
            ->findOrFail($validated['source_fee_structure_id']);

        $userId = $request->user()->id;
        $isPublished = $validated['action'] === 'publish';
        $session = AcademicSession::findOrFail($validated['academic_session_id']);

        $courseCurriculumId = $validated['assignment_scope'] === 'course' ? $validated['course_curriculum_id'] : null;
        $departmentId = $validated['assignment_scope'] === 'department' ? $validated['department_id'] : null;

        return DB::transaction(function () use ($validated, $source, $userId, $isPublished, $session, $courseCurriculumId, $departmentId) {
            // Clone template
            $template = FeeStructure::create([
                'code' => $validated['code'],
                'name' => $validated['name'],
                'description' => $source->description,
                'type' => $source->type,
                'is_active' => true,
                'is_issued' => $isPublished,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            // Clone items
            $totalAmount = 0;
            foreach ($source->items as $item) {
                FeeStructureItem::create([
                    'fee_structure_id' => $template->id,
                    'name' => $item->name,
                    'amount' => $item->amount,
                    'description' => $item->description,
                    'is_active' => true,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                ]);
                $totalAmount += (float) $item->amount;
            }

            // Create assignment (same logic as store)
            if ($validated['issuance_type'] === 'per_session') {
                CurriculumFeeStructure::create([
                    'course_curriculum_id' => $courseCurriculumId,
                    'department_id' => $departmentId,
                    'fee_structure_id' => $template->id,
                    'academic_session_id' => $session->id,
                    'issuance_type' => 'per_session',
                    'dormant' => false,
                    'split_amount' => $totalAmount,
                    'split_ratio' => 100,
                    'year_level' => $validated['year_level'],
                    'session_number' => $validated['session_number'],
                    'is_approved' => $isPublished,
                    'approved_by' => $isPublished ? $userId : null,
                    'approved_at' => $isPublished ? now() : null,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                ]);
            }

            return response()->json([
                'message' => 'Fee structure cloned successfully.',
                'data' => ['id' => $template->id, 'name' => $template->name],
            ], 201);
        });
    }

    /**
     * Publish a draft fee structure.
     */
    public function publish(Request $request, FeeStructure $fee_structure): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        if ($fee_structure->is_issued) {
            return response()->json(['message' => 'Fee structure is already published.'], 422);
        }

        DB::transaction(function () use ($fee_structure, $request) {
            $fee_structure->update([
                'is_issued' => true,
                'updated_by' => $request->user()->id,
            ]);

            CurriculumFeeStructure::where('fee_structure_id', $fee_structure->id)
                ->whereNull('parent_assignment_id')
                ->update([
                    'is_approved' => true,
                    'approved_by' => $request->user()->id,
                    'approved_at' => now(),
                ]);
        });

        return response()->json(['message' => 'Fee structure published successfully.']);
    }

    /**
     * Archive a fee structure.
     */
    public function archive(Request $request, FeeStructure $fee_structure): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        $fee_structure->update([
            'is_active' => false,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Fee structure archived.']);
    }

    /**
     * Preview what would be created without persisting.
     */
    public function preview(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $validated = $request->validate([
            'academic_session_id' => ['required', 'uuid', Rule::exists('academic_sessions', 'id')],
            'issuance_type' => ['required', Rule::in(['per_session', 'per_year'])],
            'items' => ['required', 'array', 'min:1'],
            'items.*.amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $session = AcademicSession::with('year')->findOrFail($validated['academic_session_id']);
        $totalAmount = array_sum(array_column($validated['items'], 'amount'));

        $preview = [
            'total_amount' => round($totalAmount, 2),
            'academic_session' => $session->name,
            'academic_year' => $session->year?->name,
            'issuance_type' => $validated['issuance_type'],
            'generated_assignments' => [],
        ];

        if ($validated['issuance_type'] === 'per_session') {
            $preview['generated_assignments'][] = [
                'session' => $session->name,
                'amount' => round($totalAmount, 2),
            ];
        } else {
            $sessions = $session->year->sessions()->orderBy('start_date')->get();
            $count = $sessions->count();
            foreach ($sessions as $index => $s) {
                $amount = $index === $count - 1
                    ? round($totalAmount - (round($totalAmount / $count, 2) * ($count - 1)), 2)
                    : round($totalAmount / $count, 2);
                $preview['generated_assignments'][] = [
                    'session' => $s->name,
                    'amount' => $amount,
                ];
            }
        }

        return response()->json(['data' => $preview]);
    }

    private function equalRatios(int $count): array
    {
        $ratios = [];
        $allocated = 0.0;
        for ($i = 0; $i < $count; $i++) {
            $ratio = $i === $count - 1 ? round(100 - $allocated, 2) : round(100 / $count, 2);
            $ratios[] = $ratio;
            $allocated += $ratio;
        }
        return $ratios;
    }
}
