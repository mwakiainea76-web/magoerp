<?php

namespace App\Http\Controllers\Api\Security;

use App\Http\Controllers\Controller;
use App\Models\SecurityBlockedDevice;
use App\Models\SecurityBlockedIp;
use App\Models\SecurityBlockedUser;
use App\Models\SecurityDevice;
use App\Models\SecurityEvent;
use App\Models\SecurityUserSession;
use App\Services\Security\SecurityEventService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityDashboardController extends Controller
{
    public function __construct(
        private readonly SecurityEventService $eventService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $today = now()->startOfDay();

        $failedLoginsToday = SecurityEvent::where('event_type', 'login_failed')
            ->where('created_at', '>=', $today)
            ->count();

        $highRiskUsers = SecurityDevice::where('risk_score', '>', 60)->count();

        $blockedUsers = SecurityBlockedUser::count();
        $blockedDevices = SecurityBlockedDevice::count();
        $blockedIps = SecurityBlockedIp::count();

        $activeSessions = SecurityUserSession::where('is_active', true)->count();

        $recentEvents = SecurityEvent::with('user')
            ->latest()
            ->take(10)
            ->get()
            ->map(fn (SecurityEvent $e) => [
                'id' => $e->id,
                'event_type' => $e->event_type->value,
                'severity' => $e->severity->value,
                'risk_points' => $e->risk_points,
                'user_name' => $e->user?->full_name ?? 'System',
                'ip_address' => $e->ip_address,
                'created_at' => $e->created_at,
                'resolved' => $e->resolved,
            ]);

        $eventsByType = SecurityEvent::selectRaw("event_type, count(*) as count")
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('event_type')
            ->orderByDesc('count')
            ->limit(10)
            ->pluck('count', 'event_type')
            ->toArray();

        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i)->format('Y-m-d');
            $trend[$day] = SecurityEvent::whereDate('created_at', $day)->count();
        }

        return response()->json([
            'data' => [
                'failed_logins_today' => $failedLoginsToday,
                'high_risk_users' => $highRiskUsers,
                'blocked_users' => $blockedUsers,
                'blocked_devices' => $blockedDevices,
                'blocked_ips' => $blockedIps,
                'active_sessions' => $activeSessions,
                'recent_events' => $recentEvents,
                'events_by_type' => $eventsByType,
                'risk_trend' => $trend,
            ],
        ]);
    }
}
