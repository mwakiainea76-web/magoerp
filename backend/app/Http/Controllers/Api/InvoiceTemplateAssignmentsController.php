<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CourseInvoiceTemplate;
use App\Models\InvoiceTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvoiceTemplateAssignmentsController extends Controller
{
    public function index(Request $request, InvoiceTemplate $invoice_template): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $items = CourseInvoiceTemplate::query()
            ->where('invoice_template_id', $invoice_template->id)
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
            ->map(fn (CourseInvoiceTemplate $cit) => $this->transform($cit))
            ->values();

        return response()->json([
            'data' => $items,
            'invoice_template_name' => $invoice_template->name,
            'invoice_template_code' => $invoice_template->code,
            'invoice_template_total_amount' => (float) $invoice_template->items()->sum('amount'),
        ]);
    }

    public function store(Request $request, InvoiceTemplate $invoice_template): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $validated = $request->validate([
            'course_id' => ['required', 'uuid', Rule::exists('courses', 'id')],
            'year_level' => ['required', 'integer', 'min:1', 'max:10'],
            'session_number' => ['required', 'integer', 'min:1', 'max:10'],
            'is_approved' => ['boolean'],
        ]);

        $exists = CourseInvoiceTemplate::query()
            ->where('course_id', $validated['course_id'])
            ->where('year_level', $validated['year_level'])
            ->where('session_number', $validated['session_number'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'This course already has an invoice template for Year ' . $validated['year_level'] . ' Session ' . $validated['session_number'] . '.',
            ], 409);
        }

        $cit = CourseInvoiceTemplate::create([
            'course_id' => $validated['course_id'],
            'invoice_template_id' => $invoice_template->id,
            'year_level' => $validated['year_level'],
            'session_number' => $validated['session_number'],
            'is_approved' => $request->boolean('is_approved', false),
            'approved_by' => $request->boolean('is_approved') ? $request->user()->id : null,
            'approved_at' => $request->boolean('is_approved') ? now() : null,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $cit->load(['course' => function ($query) {
            $query->with('level:id,name')
                ->with(['curricula' => function ($q) {
                    $q->wherePivot('is_active', true)->select('curricula.id', 'curricula.code', 'curricula.name');
                }])
                ->select('id', 'code', 'name', 'certification_level_id');
        }]);

        return response()->json([
            'message' => 'Course linked to invoice template successfully.',
            'data' => $this->transform($cit),
        ], 201);
    }

    public function update(Request $request, InvoiceTemplate $invoice_template, CourseInvoiceTemplate $course_invoice_template): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $validated = $request->validate([
            'is_approved' => ['required', 'boolean'],
        ]);

        $course_invoice_template->update([
            'is_approved' => $validated['is_approved'],
            'approved_by' => $validated['is_approved'] ? $request->user()->id : null,
            'approved_at' => $validated['is_approved'] ? now() : null,
            'updated_by' => $request->user()->id,
        ]);

        $course_invoice_template->load(['course' => function ($query) {
            $query->with('level:id,name')
                ->with(['curricula' => function ($q) {
                    $q->wherePivot('is_active', true)->select('curricula.id', 'curricula.code', 'curricula.name');
                }])
                ->select('id', 'code', 'name', 'certification_level_id');
        }]);

        return response()->json([
            'message' => $validated['is_approved'] ? 'Invoice template approved for this course.' : 'Invoice template approval revoked.',
            'data' => $this->transform($course_invoice_template),
        ]);
    }

    public function destroy(Request $request, InvoiceTemplate $invoice_template, CourseInvoiceTemplate $course_invoice_template): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $course_invoice_template->delete();

        return response()->json([
            'message' => 'Course unlinked from invoice template successfully.',
        ]);
    }

    private function transform(CourseInvoiceTemplate $cit): array
    {
        $activeCurriculum = $cit->course?->curricula?->first();

        return [
            'id' => $cit->id,
            'course_id' => $cit->course_id,
            'course_code' => $cit->course?->code,
            'course_name' => $cit->course?->name,
            'course_curriculum_name' => $activeCurriculum?->code . ' ' . $activeCurriculum?->name,
            'course_level_name' => $cit->course?->level?->name,
            'year_level' => $cit->year_level,
            'session_number' => $cit->session_number,
            'is_approved' => $cit->is_approved,
            'approved_at' => $cit->approved_at,
        ];
    }
}
