<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\ExamSeries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamSeriesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage-exam-series'), 403);

        $validated = $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $series = ExamSeries::query()
            ->with('createdBy:id,first_name,middle_name,last_name')
            ->with('academicSession:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate($validated['per_page'] ?? 50);

        return response()->json([
            'data' => $series->getCollection()->map(fn ($s) => $this->transform($s)),
            'meta' => [
                'current_page' => $series->currentPage(),
                'last_page' => $series->lastPage(),
                'per_page' => $series->perPage(),
                'total' => $series->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage-exam-series'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'short_name' => 'nullable|string|max:50',
            'assessment_types' => 'nullable|array',
            'assessment_types.*' => 'string|max:50',
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'is_active' => 'nullable|boolean',
        ]);

        $series = ExamSeries::create([
            'name' => $validated['name'],
            'short_name' => $validated['short_name'] ?? null,
            'assessment_types' => $validated['assessment_types'] ?? null,
            'academic_session_id' => $validated['academic_session_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->transform($series->fresh())], 201);
    }

    public function show(Request $request, ExamSeries $examSeries): JsonResponse
    {
        abort_unless($request->user()?->can('manage-exam-series'), 403);

        $examSeries->load(['createdBy:id,first_name,middle_name,last_name', 'academicSession:id,name']);

        return response()->json(['data' => $this->transform($examSeries)]);
    }

    public function update(Request $request, ExamSeries $examSeries): JsonResponse
    {
        abort_unless($request->user()?->can('manage-exam-series'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'short_name' => 'nullable|string|max:50',
            'assessment_types' => 'nullable|array',
            'assessment_types.*' => 'string|max:50',
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'is_active' => 'nullable|boolean',
        ]);

        $examSeries->update([
            'name' => $validated['name'],
            'short_name' => $validated['short_name'] ?? null,
            'assessment_types' => $validated['assessment_types'] ?? null,
            'academic_session_id' => $validated['academic_session_id'] ?? $examSeries->academic_session_id,
            'is_active' => $validated['is_active'] ?? $examSeries->is_active,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->transform($examSeries->fresh())]);
    }

    public function destroy(Request $request, ExamSeries $examSeries): JsonResponse
    {
        abort_unless($request->user()?->can('manage-exam-series'), 403);

        $examSeries->delete();

        return response()->json(['message' => 'Exam series deleted.']);
    }

    public function options(Request $request): JsonResponse
    {
        $series = ExamSeries::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'short_name', 'assessment_types', 'academic_session_id']);

        return response()->json(['data' => $series->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'short_name' => $s->short_name,
            'assessment_types' => $s->assessment_types,
            'academic_session_id' => $s->academic_session_id,
        ])]);
    }

    public function availableSessions(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage-exam-series'), 403);

        $sessions = AcademicSession::query()
            ->where('is_active', true)
            ->orWhereHas('sessionEnrolments.studentMarks')
            ->orderBy('start_date', 'desc')
            ->take(10)
            ->get(['id', 'name', 'code', 'start_date']);

        return response()->json(['data' => $sessions]);
    }

    private function transform(ExamSeries $series): array
    {
        return [
            'id' => $series->id,
            'name' => $series->name,
            'short_name' => $series->short_name,
            'assessment_types' => $series->assessment_types,
            'is_active' => $series->is_active,
            'academic_session_id' => $series->academic_session_id,
            'academic_session' => $series->academicSession ? [
                'id' => $series->academicSession->id,
                'name' => $series->academicSession->name,
            ] : null,
            'created_by' => $series->createdBy ? [
                'id' => $series->createdBy->id,
                'name' => trim(collect([$series->createdBy->first_name, $series->createdBy->middle_name, $series->createdBy->last_name])->filter()->implode(' ')),
            ] : null,
            'created_at' => $series->created_at,
            'updated_at' => $series->updated_at,
        ];
    }
}
