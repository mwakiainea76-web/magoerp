<?php

namespace App\Http\Controllers\Api\Security;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\SecurityUserSession;
use App\Services\Security\SessionManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecuritySessionsController extends Controller
{
    use PaginationMeta;

    public function __construct(
        private readonly SessionManager $sessionManager,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $userId = (string) $request->string('user_id', '');
        $isActive = (string) $request->string('is_active', '');
        $dateFrom = (string) $request->string('date_from', '');
        $dateTo = (string) $request->string('date_to', '');
        $sortBy = (string) $request->string('sort_by', 'last_activity');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sessions = SecurityUserSession::with('user', 'device')
            ->when($search !== '', fn ($q) => $q->where(function ($q) use ($search) {
                $q->where('ip_address', 'like', "%{$search}%")
                    ->orWhere('browser', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            }))
            ->when($userId !== '', fn ($q) => $q->where('user_id', $userId))
            ->when($isActive !== '', fn ($q) => $q->where('is_active', $isActive === 'true'))
            ->when($dateFrom !== '', fn ($q) => $q->whereDate('login_at', '>=', $dateFrom))
            ->when($dateTo !== '', fn ($q) => $q->whereDate('login_at', '<=', $dateTo))
            ->orderBy($sortBy, $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $sessions->getCollection()->map(fn (SecurityUserSession $s) => $this->transform($s))->values(),
            'meta' => $this->paginationMeta($sessions, [
                'q' => $search,
                'user_id' => $userId,
                'is_active' => $isActive,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ]),
        ]);
    }

    public function show(Request $request, SecurityUserSession $securityUserSession): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $securityUserSession->load('user', 'device');

        return response()->json(['data' => $this->transform($securityUserSession)]);
    }

    public function destroy(Request $request, SecurityUserSession $securityUserSession): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $this->sessionManager->close($securityUserSession->session_id);

        return response()->json(['message' => 'Session terminated.']);
    }

    public function destroyOthers(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $userId = (string) $request->string('user_id', '');
        $currentSessionId = $request->attributes->get('security_session_id');

        if (!$userId) {
            return response()->json(['message' => 'user_id is required.'], 422);
        }

        $count = $this->sessionManager->closeAllForUser($userId, $currentSessionId);

        return response()->json(['message' => "{$count} other sessions terminated."]);
    }

    private function transform(SecurityUserSession $s): array
    {
        return [
            'id' => $s->id,
            'user_id' => $s->user_id,
            'user_name' => $s->user?->full_name,
            'device_id' => $s->device_id,
            'device_browser' => $s->device?->browser,
            'session_id' => $s->session_id,
            'ip_address' => $s->ip_address,
            'country' => $s->country,
            'city' => $s->city,
            'browser' => $s->browser,
            'operating_system' => $s->operating_system,
            'login_at' => $s->login_at,
            'last_activity' => $s->last_activity,
            'logout_at' => $s->logout_at,
            'is_active' => $s->is_active,
            'duration_minutes' => $s->login_at ? now()->diffInMinutes($s->login_at) : null,
        ];
    }
}
