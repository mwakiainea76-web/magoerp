<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceAuditLog;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinanceAuditController extends Controller
{
    /**
     * Display a listing of audit logs with optional filtering.
     *
     * Query Parameters:
     *  - student_id (required): Filter by student
     *  - action: Filter by action type
     *  - entity_type: Filter by entity type (invoice, payment, adjustment, etc.)
     *  - from_date: Filter entries from this date (YYYY-MM-DD)
     *  - to_date: Filter entries until this date (YYYY-MM-DD)
     *  - per_page: Pagination limit (default 50)
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'action' => 'nullable|string',
            'entity_type' => 'nullable|string',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'per_page' => 'nullable|integer|max:100',
        ]);

        $query = FinanceAuditLog::query()
            ->where('student_id', $validated['student_id'])
            ->with(['student:id,student_id_number,first_name,last_name', 'user:id,name,email']);

        if ($validated['action'] ?? null) {
            $query->where('action', $validated['action']);
        }

        if ($validated['entity_type'] ?? null) {
            $query->where('entity_type', $validated['entity_type']);
        }

        if ($validated['from_date'] ?? null) {
            $query->whereDate('created_at', '>=', $validated['from_date']);
        }

        if ($validated['to_date'] ?? null) {
            $query->whereDate('created_at', '<=', $validated['to_date']);
        }

        return $query
            ->latest('created_at')
            ->paginate($validated['per_page'] ?? 50)
            ->through(fn (FinanceAuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action->value,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'changes' => $log->changes,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at->toIso8601String(),
            ]);
    }

    /**
     * Display a specific audit log entry.
     */
    public function show(FinanceAuditLog $financeAuditLog)
    {
        $financeAuditLog->load(['student:id,student_id_number,first_name,last_name', 'user:id,name,email']);

        return [
            'id' => $financeAuditLog->id,
            'student' => [
                'id' => $financeAuditLog->student->id,
                'student_id_number' => $financeAuditLog->student->student_id_number,
                'name' => "{$financeAuditLog->student->first_name} {$financeAuditLog->student->last_name}",
            ],
            'action' => $financeAuditLog->action->value,
            'entity_type' => $financeAuditLog->entity_type,
            'entity_id' => $financeAuditLog->entity_id,
            'changes' => $financeAuditLog->changes,
            'user' => $financeAuditLog->user ? [
                'id' => $financeAuditLog->user->id,
                'name' => $financeAuditLog->user->name,
                'email' => $financeAuditLog->user->email,
            ] : null,
            'ip_address' => $financeAuditLog->ip_address,
            'user_agent' => $financeAuditLog->user_agent,
            'created_at' => $financeAuditLog->created_at->toIso8601String(),
        ];
    }
}
