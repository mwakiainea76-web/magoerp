<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\ApiEndpointError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiMonitoringController extends Controller
{
    use PaginationMeta;

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('api.monitoring.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', '');
        $method = (string) $request->string('method', '');
        $dateFrom = (string) $request->string('date_from', '');
        $dateTo = (string) $request->string('date_to', '');
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $items = ApiEndpointError::query()
            ->when($search !== '', fn ($q) => $q->where(function ($q) use ($search) {
                $q->where('path', 'like', "%{$search}%")
                    ->orWhere('last_error_message', 'like', "%{$search}%");
            }))
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->when($method !== '', fn ($q) => $q->where('method', $method))
            ->when($dateFrom !== '', fn ($q) => $q->whereDate('last_occurred_at', '>=', $dateFrom))
            ->when($dateTo !== '', fn ($q) => $q->whereDate('last_occurred_at', '<=', $dateTo))
            ->latest('last_occurred_at')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $items->getCollection()->map(fn (ApiEndpointError $e) => $this->transform($e))->values(),
            'meta' => $this->paginationMeta($items, [
                'q' => $search,
                'status' => $status,
                'method' => $method,
            ]),
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('api.monitoring.view'), 403);

        return response()->json([
            'data' => [
                'total_endpoints' => ApiEndpointError::count(),
                'pending' => ApiEndpointError::where('status', 'pending')->count(),
                'escalated' => ApiEndpointError::where('status', 'escalated')->count(),
                'resolved' => ApiEndpointError::where('status', 'resolved')->count(),
                'top_endpoints' => ApiEndpointError::orderByDesc('error_count')->limit(10)->get()
                    ->map(fn ($e) => ['method' => $e->method, 'path' => $e->path, 'count' => $e->error_count]),
            ],
        ]);
    }

    public function show(Request $request, ApiEndpointError $apiEndpointError): JsonResponse
    {
        abort_unless($request->user()?->can('api.monitoring.view'), 403);

        return response()->json(['data' => $this->transform($apiEndpointError)]);
    }

    public function escalate(Request $request, ApiEndpointError $apiEndpointError): JsonResponse
    {
        abort_unless($request->user()?->can('api.monitoring.manage'), 403);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $apiEndpointError->update([
            'status' => 'escalated',
            'escalated_by' => $request->user()->id,
            'escalated_at' => now(),
            'escalation_note' => $validated['note'] ?? null,
        ]);

        return response()->json(['data' => $this->transform($apiEndpointError), 'message' => 'Error escalated.']);
    }

    public function resolve(Request $request, ApiEndpointError $apiEndpointError): JsonResponse
    {
        abort_unless($request->user()?->can('api.monitoring.manage'), 403);

        $apiEndpointError->update(['status' => 'resolved']);

        return response()->json(['message' => 'Error resolved.']);
    }

    public function clearResolved(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('api.monitoring.manage'), 403);

        $deleted = ApiEndpointError::where('status', 'resolved')->delete();

        return response()->json(['message' => "{$deleted} resolved errors cleared."]);
    }

    private function transform(ApiEndpointError $e): array
    {
        return [
            'id' => $e->id,
            'method' => $e->method,
            'path' => $e->path,
            'error_count' => $e->error_count,
            'last_error_message' => $e->last_error_message,
            'last_context' => $e->last_context,
            'last_ip' => $e->last_ip,
            'status' => $e->status,
            'escalated_by' => $e->escalated_by,
            'escalated_at' => $e->escalated_at,
            'escalation_note' => $e->escalation_note,
            'first_occurred_at' => $e->first_occurred_at,
            'last_occurred_at' => $e->last_occurred_at,
        ];
    }
}
