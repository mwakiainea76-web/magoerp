<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseFeePlanRequest;
use App\Http\Requests\UpdateCourseFeePlanRequest;
use App\Models\Course;
use App\Models\CourseFeePlan;
use App\Models\FeePlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseFeePlansController extends Controller
{
    public function index(Request $request, Course $course): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $items = CourseFeePlan::query()
            ->where('course_id', $course->id)
            ->with('feePlan:id,code,name')
            ->orderBy('year_level')
            ->orderBy('session_number')
            ->get()
            ->map(fn (CourseFeePlan $cfp) => $this->transform($cfp))
            ->values();

        return response()->json([
            'data' => $items,
        ]);
    }

    public function store(StoreCourseFeePlanRequest $request, Course $course): JsonResponse
    {
        $exists = CourseFeePlan::query()
            ->where('course_id', $course->id)
            ->where('year_level', $request->year_level)
            ->where('session_number', $request->session_number)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'This course already has a fee plan for Year ' . $request->year_level . ' Session ' . $request->session_number . '.',
            ], 409);
        }

        $cfp = CourseFeePlan::create([
            'course_id' => $course->id,
            'fee_plan_id' => $request->fee_plan_id,
            'year_level' => $request->year_level,
            'session_number' => $request->session_number,
            'is_approved' => $request->boolean('is_approved', false),
            'approved_by' => $request->boolean('is_approved') ? $request->user()->id : null,
            'approved_at' => $request->boolean('is_approved') ? now() : null,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $cfp->load('feePlan:id,code,name');

        return response()->json([
            'message' => 'Fee plan assigned to course successfully.',
            'data' => $this->transform($cfp),
        ], 201);
    }

    public function update(UpdateCourseFeePlanRequest $request, Course $course, CourseFeePlan $course_fee_plan): JsonResponse
    {
        $data = $request->validated();

        if ($request->has('fee_plan_id')) {
            $data['fee_plan_id'] = $request->fee_plan_id;
        }

        if ($request->has('is_approved')) {
            $data['is_approved'] = $request->boolean('is_approved');
            $data['approved_by'] = $request->boolean('is_approved') ? $request->user()->id : null;
            $data['approved_at'] = $request->boolean('is_approved') ? now() : null;
        }

        $data['updated_by'] = $request->user()->id;

        $course_fee_plan->update($data);
        $course_fee_plan->load('feePlan:id,code,name');

        return response()->json([
            'message' => 'Fee plan assignment updated successfully.',
            'data' => $this->transform($course_fee_plan),
        ]);
    }

    public function destroy(Request $request, Course $course, CourseFeePlan $course_fee_plan): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $course_fee_plan->delete();

        return response()->json([
            'message' => 'Fee plan assignment removed successfully.',
        ]);
    }

    private function transform(CourseFeePlan $cfp): array
    {
        return [
            'id' => $cfp->id,
            'course_id' => $cfp->course_id,
            'fee_plan_id' => $cfp->fee_plan_id,
            'fee_plan_code' => $cfp->feePlan?->code,
            'fee_plan_name' => $cfp->feePlan?->name,
            'year_level' => $cfp->year_level,
            'session_number' => $cfp->session_number,
            'is_approved' => $cfp->is_approved,
            'approved_by' => $cfp->approved_by,
            'approved_at' => $cfp->approved_at,
            'created_at' => $cfp->created_at,
            'updated_at' => $cfp->updated_at,
        ];
    }
}
