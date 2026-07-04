<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportRequestsController extends Controller
{
    public function myRequests(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $requests = SupportRequest::query()
            ->where('student_id', $student->id)
            ->with('escalatedTo.user:id,first_name,last_name')
            ->latest()
            ->get()
            ->map(fn ($r) => $this->transform($r));

        return response()->json(['data' => $requests]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $validated = $request->validate([
            'subject' => 'required|string|max:200',
            'description' => 'required|string|max:5000',
        ]);

        $supportRequest = SupportRequest::create([
            'student_id' => $student->id,
            'subject' => $validated['subject'],
            'description' => $validated['description'],
        ]);

        return response()->json(['data' => $this->transform($supportRequest)], 201);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:pending,in_review,escalated,resolved',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = SupportRequest::query()
            ->with([
                'student.user:id,first_name,middle_name,last_name',
                'escalatedTo.user:id,first_name,last_name',
            ]);

        if ($status = $validated['status'] ?? null) {
            $query->where('status', $status);
        }

        $requests = $query->latest()->paginate($validated['per_page'] ?? 20);

        $requests->getCollection()->transform(fn ($r) => $this->transform($r));

        return response()->json(array_merge([], ($requests)->toArray()), 200);
    }

    public function show(SupportRequest $support_request): JsonResponse
    {
        $support_request->load([
            'student.user:id,first_name,middle_name,last_name',
            'escalatedTo.user:id,first_name,last_name',
        ]);

        return response()->json(['data' => $this->transform($support_request)]);
    }

    public function escalate(Request $request, SupportRequest $support_request): JsonResponse
    {
        $validated = $request->validate([
            'escalated_to' => 'required|string|exists:staffs,id',
            'admin_notes' => 'nullable|string|max:5000',
        ]);

        $support_request->update([
            'status' => 'escalated',
            'escalated_to' => $validated['escalated_to'],
            'escalated_at' => now(),
            'admin_notes' => $validated['admin_notes'] ?? $support_request->admin_notes,
        ]);

        $support_request->load(['student.user:id,first_name,middle_name,last_name', 'escalatedTo.user:id,first_name,last_name']);

        return response()->json(['data' => $this->transform($support_request)]);
    }

    public function resolve(Request $request, SupportRequest $support_request): JsonResponse
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:5000',
        ]);

        $support_request->update([
            'status' => 'resolved',
            'admin_notes' => $validated['admin_notes'] ?? $support_request->admin_notes,
            'resolved_at' => now(),
        ]);

        $support_request->load(['student.user:id,first_name,middle_name,last_name', 'escalatedTo.user:id,first_name,last_name']);

        return response()->json(['data' => $this->transform($support_request)]);
    }

    public function review(Request $request, SupportRequest $support_request): JsonResponse
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:5000',
        ]);

        $support_request->update([
            'status' => 'in_review',
            'admin_notes' => $validated['admin_notes'] ?? $support_request->admin_notes,
        ]);

        $support_request->load(['student.user:id,first_name,middle_name,last_name', 'escalatedTo.user:id,first_name,last_name']);

        return response()->json(['data' => $this->transform($support_request)]);
    }

    public function staffList(Request $request): JsonResponse
    {
        return response()->json([
            'data' => Staffs::query()
                ->where('status', true)
                ->with('user:id,first_name,last_name')
                ->get(['id', 'user_id', 'employee_number'])
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => trim($s->first_name . ' ' . $s->last_name),
                    'employee_number' => $s->employee_number,
                ]),
        ]);
    }

    private function transform($supportRequest): array
    {
        return [
            'id' => $supportRequest->id,
            'student_id' => $supportRequest->student_id,
            'student_name' => $supportRequest->student
                ? trim(collect([$supportRequest->student->first_name, $supportRequest->student->middle_name, $supportRequest->student->last_name])->filter()->implode(' '))
                : null,
            'admission_number' => $supportRequest->student?->admission_number,
            'subject' => $supportRequest->subject,
            'description' => $supportRequest->description,
            'status' => $supportRequest->status,
            'escalated_to' => $supportRequest->escalated_to,
            'escalated_to_name' => $supportRequest->escalatedTo
                ? trim($supportRequest->escalatedTo->first_name . ' ' . $supportRequest->escalatedTo->last_name)
                : null,
            'escalated_at' => $supportRequest->escalated_at?->toISOString(),
            'admin_notes' => $supportRequest->admin_notes,
            'resolved_at' => $supportRequest->resolved_at?->toISOString(),
            'created_at' => $supportRequest->created_at?->toISOString(),
        ];
    }
}
