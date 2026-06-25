<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplaintsController extends Controller
{
    public function myComplaints(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json([ 'message' => 'Student profile not found.'], 404);
        }

        $complaints = Complaint::query()
            ->where('student_id', $student->id)
            ->with('escalatedTo:id,first_name,last_name')
            ->latest()
            ->get()
            ->map(fn ($c) => $this->transform($c));

        return response()->json([ 'data' => $complaints]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json([ 'message' => 'Student profile not found.'], 404);
        }

        $validated = $request->validate([
            'subject' => 'required|string|max:200',
            'description' => 'required|string|max:5000',
        ]);

        $complaint = Complaint::create([
            'student_id' => $student->id,
            'subject' => $validated['subject'],
            'description' => $validated['description'],
        ]);

        return response()->json([ 'data' => $this->transform($complaint)], 201);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:pending,in_review,escalated,resolved',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Complaint::query()
            ->with([
                'student:id,first_name,middle_name,last_name,admission_number',
                'escalatedTo:id,first_name,last_name',
            ]);

        if ($status = $validated['status'] ?? null) {
            $query->where('status', $status);
        }

        $complaints = $query->latest()->paginate($validated['per_page'] ?? 20);

        $complaints->getCollection()->transform(fn ($c) => $this->transform($c));

        return response()->json(array_merge([], ($complaints)->toArray()), 200);
    }

    public function show(Complaint $complaint): JsonResponse
    {
        $complaint->load([
            'student:id,first_name,middle_name,last_name,admission_number',
            'escalatedTo:id,first_name,last_name,employee_number',
        ]);

        return response()->json([ 'data' => $this->transform($complaint)]);
    }

    public function escalate(Request $request, Complaint $complaint): JsonResponse
    {
        $validated = $request->validate([
            'escalated_to' => 'required|string|exists:staffs,id',
            'admin_notes' => 'nullable|string|max:5000',
        ]);

        $complaint->update([
            'status' => 'escalated',
            'escalated_to' => $validated['escalated_to'],
            'escalated_at' => now(),
            'admin_notes' => $validated['admin_notes'] ?? $complaint->admin_notes,
        ]);

        $complaint->load(['student:id,first_name,middle_name,last_name,admission_number', 'escalatedTo:id,first_name,last_name']);

        return response()->json([ 'data' => $this->transform($complaint)]);
    }

    public function resolve(Request $request, Complaint $complaint): JsonResponse
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:5000',
        ]);

        $complaint->update([
            'status' => 'resolved',
            'admin_notes' => $validated['admin_notes'] ?? $complaint->admin_notes,
            'resolved_at' => now(),
        ]);

        $complaint->load(['student:id,first_name,middle_name,last_name,admission_number', 'escalatedTo:id,first_name,last_name']);

        return response()->json([ 'data' => $this->transform($complaint)]);
    }

    public function review(Request $request, Complaint $complaint): JsonResponse
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:5000',
        ]);

        $complaint->update([
            'status' => 'in_review',
            'admin_notes' => $validated['admin_notes'] ?? $complaint->admin_notes,
        ]);

        $complaint->load(['student:id,first_name,middle_name,last_name,admission_number', 'escalatedTo:id,first_name,last_name']);

        return response()->json([ 'data' => $this->transform($complaint)]);
    }

    public function staffList(Request $request): JsonResponse
    {
        return response()->json([
            'data' => staffs::query()
                ->where('status', true)
                ->get(['id', 'first_name', 'last_name', 'employee_number'])
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => trim($s->first_name . ' ' . $s->last_name),
                    'employee_number' => $s->employee_number,
                ]),
        ]);
    }

    private function transform($complaint): array
    {
        return [
            'id' => $complaint->id,
            'student_id' => $complaint->student_id,
            'student_name' => $complaint->student
                ? trim(collect([$complaint->student->first_name, $complaint->student->middle_name, $complaint->student->last_name])->filter()->implode(' '))
                : null,
            'admission_number' => $complaint->student?->admission_number,
            'subject' => $complaint->subject,
            'description' => $complaint->description,
            'status' => $complaint->status,
            'escalated_to' => $complaint->escalated_to,
            'escalated_to_name' => $complaint->escalatedTo
                ? trim($complaint->escalatedTo->first_name . ' ' . $complaint->escalatedTo->last_name)
                : null,
            'escalated_at' => $complaint->escalated_at?->toISOString(),
            'admin_notes' => $complaint->admin_notes,
            'resolved_at' => $complaint->resolved_at?->toISOString(),
            'created_at' => $complaint->created_at?->toISOString(),
        ];
    }
}
