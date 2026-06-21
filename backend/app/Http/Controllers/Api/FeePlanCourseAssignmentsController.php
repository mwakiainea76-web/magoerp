<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CourseFeePlan;
use App\Models\FeePlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeePlanCourseAssignmentsController extends Controller
{
    public function index(Request $request, FeePlan $fee_plan): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $items = CourseFeePlan::query()
            ->where('fee_plan_id', $fee_plan->id)
            ->with(['course' => function ($query) {
                $query->with('level:id,name')
                    ->with(['curricula' => function ($q) {
                        $q->wherePivot('is_active', true)->select('curricula.id', 'curricula.code', 'curricula.name');
                    }])
                    ->select('id', 'code', 'name', 'certification_level_id');
            }])
            ->orderBy('year_level')
            ->orderBy('session_number')
            ->get()
            ->map(fn (CourseFeePlan $cfp) => $this->transform($cfp))
            ->values();

        return response()->json([
            'data' => $items,
            'fee_plan_name' => $fee_plan->name,
            'fee_plan_code' => $fee_plan->code,
            'fee_plan_total_amount' => (float) $fee_plan->items()->sum('amount'),
        ]);
    }

    public function store(Request $request, FeePlan $fee_plan): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $validated = $request->validate([
            'course_id' => ['required', 'uuid', Rule::exists('courses', 'id')],
            'year_level' => ['required', 'integer', 'min:1', 'max:10'],
            'session_number' => ['required', 'integer', 'min:1', 'max:10'],
            'is_approved' => ['boolean'],
        ]);

        $exists = CourseFeePlan::query()
            ->where('course_id', $validated['course_id'])
            ->where('year_level', $validated['year_level'])
            ->where('session_number', $validated['session_number'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'This course already has a fee plan for Year ' . $validated['year_level'] . ' Session ' . $validated['session_number'] . '.',
            ], 409);
        }

        $cfp = CourseFeePlan::create([
            'course_id' => $validated['course_id'],
            'fee_plan_id' => $fee_plan->id,
            'year_level' => $validated['year_level'],
            'session_number' => $validated['session_number'],
            'is_approved' => $request->boolean('is_approved', false),
            'approved_by' => $request->boolean('is_approved') ? $request->user()->id : null,
            'approved_at' => $request->boolean('is_approved') ? now() : null,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $cfp->load(['course' => function ($query) {
            $query->with('level:id,name')
                ->with(['curricula' => function ($q) {
                    $q->wherePivot('is_active', true)->select('curricula.id', 'curricula.code', 'curricula.name');
                }])
                ->select('id', 'code', 'name', 'certification_level_id');
        }]);

        return response()->json([
            'message' => 'Course linked to fee plan successfully.',
            'data' => $this->transform($cfp),
        ], 201);
    }

    public function update(Request $request, FeePlan $fee_plan, CourseFeePlan $course_fee_plan): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $validated = $request->validate([
            'is_approved' => ['required', 'boolean'],
        ]);

        $course_fee_plan->update([
            'is_approved' => $validated['is_approved'],
            'approved_by' => $validated['is_approved'] ? $request->user()->id : null,
            'approved_at' => $validated['is_approved'] ? now() : null,
            'updated_by' => $request->user()->id,
        ]);

        $course_fee_plan->load(['course' => function ($query) {
            $query->with('level:id,name')
                ->with(['curricula' => function ($q) {
                    $q->wherePivot('is_active', true)->select('curricula.id', 'curricula.code', 'curricula.name');
                }])
                ->select('id', 'code', 'name', 'certification_level_id');
        }]);

        return response()->json([
            'message' => $validated['is_approved'] ? 'Fee plan approved for this course.' : 'Fee plan approval revoked.',
            'data' => $this->transform($course_fee_plan),
        ]);
    }

    public function destroy(Request $request, FeePlan $fee_plan, CourseFeePlan $course_fee_plan): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $course_fee_plan->delete();

        return response()->json([
            'message' => 'Course unlinked from fee plan successfully.',
        ]);
    }

    private function transform(CourseFeePlan $cfp): array
    {
        $activeCurriculum = $cfp->course?->curricula?->first();

        return [
            'id' => $cfp->id,
            'course_id' => $cfp->course_id,
            'course_code' => $cfp->course?->code,
            'course_name' => $cfp->course?->name,
            'course_curriculum_name' => $activeCurriculum?->code . ' ' . $activeCurriculum?->name,
            'course_level_name' => $cfp->course?->level?->name,
            'year_level' => $cfp->year_level,
            'session_number' => $cfp->session_number,
            'is_approved' => $cfp->is_approved,
            'approved_at' => $cfp->approved_at,
        ];
    }
}
