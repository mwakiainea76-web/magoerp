<?php

namespace App\Http\Controllers\Api\Security;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\SecurityEvent;
use App\Services\Security\SecurityEventService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityEventsController extends Controller
{
    use PaginationMeta;

    public function __construct(
        private readonly SecurityEventService $eventService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $eventType = (string) $request->string('event_type', '');
        $severity = (string) $request->string('severity', '');
        $dateFrom = (string) $request->string('date_from', '');
        $dateTo = (string) $request->string('date_to', '');
        $resolved = (string) $request->string('resolved', '');
        $userId = (string) $request->string('user_id', '');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $events = SecurityEvent::with('user')
            ->when($search !== '', fn ($q) => $q->where('ip_address', 'like', "%{$search}%"))
            ->when($eventType !== '', fn ($q) => $q->where('event_type', $eventType))
            ->when($severity !== '', fn ($q) => $q->where('severity', $severity))
            ->when($dateFrom !== '', fn ($q) => $q->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo !== '', fn ($q) => $q->whereDate('created_at', '<=', $dateTo))
            ->when($resolved !== '', fn ($q) => $q->where('resolved', $resolved === 'true'))
            ->when($userId !== '', fn ($q) => $q->where('user_id', $userId))
            ->orderBy($sortBy, $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $events->getCollection()->map(fn (SecurityEvent $e) => $this->transform($e))->values(),
            'meta' => $this->paginationMeta($events, [
                'q' => $search,
                'event_type' => $eventType,
                'severity' => $severity,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'resolved' => $resolved,
                'user_id' => $userId,
            ]),
        ]);
    }

    public function show(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $securityEvent->load('user', 'device');

        return response()->json(['data' => $this->transform($securityEvent)]);
    }

    public function resolve(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $securityEvent->update(['resolved' => true]);

        return response()->json(['message' => 'Event resolved.']);
    }

    private function transform(SecurityEvent $e): array
    {
        return [
            'id' => $e->id,
            'user_id' => $e->user_id,
            'user_name' => $e->user?->full_name ?? 'System',
            'device_id' => $e->device_id,
            'session_id' => $e->session_id,
            'ip_address' => $e->ip_address,
            'event_type' => $e->event_type->value,
            'risk_points' => $e->risk_points,
            'severity' => $e->severity->value,
            'metadata' => $e->metadata,
            'resolved' => $e->resolved,
            'created_at' => $e->created_at,
        ];
    }
}
