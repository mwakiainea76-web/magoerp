<?php

namespace App\Http\Controllers\Api\Security;

use App\Http\Controllers\Controller;
use App\Models\SecurityDevice;
use App\Models\SecurityEvent;
use App\Models\SecurityUserSession;
use App\Models\User;
use App\Services\Security\DeviceManager;
use App\Services\Security\RiskEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityUserProfileController extends Controller
{
    public function __construct(
        private readonly DeviceManager $deviceManager,
        private readonly RiskEngine $riskEngine,
    ) {}

    public function show(Request $request, string $userId): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $user = User::findOrFail($userId);

        $devices = SecurityDevice::where('user_id', $userId)
            ->orderByDesc('last_seen_at')
            ->get()
            ->map(fn (SecurityDevice $d) => [
                'id' => $d->id,
                'uuid' => $d->uuid,
                'browser' => $d->browser,
                'operating_system' => $d->operating_system,
                'device_type' => $d->device_type,
                'risk_score' => $d->risk_score,
                'is_trusted' => $d->is_trusted,
                'first_seen_at' => $d->first_seen_at,
                'last_seen_at' => $d->last_seen_at,
            ]);

        $activeSessions = SecurityUserSession::with('device')
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->orderByDesc('last_activity')
            ->get()
            ->map(fn (SecurityUserSession $s) => [
                'id' => $s->id,
                'device_browser' => $s->device?->browser,
                'ip_address' => $s->ip_address,
                'country' => $s->country,
                'city' => $s->city,
                'login_at' => $s->login_at,
                'last_activity' => $s->last_activity,
            ]);

        $recentEvents = SecurityEvent::where('user_id', $userId)
            ->latest()
            ->take(20)
            ->get()
            ->map(fn (SecurityEvent $e) => [
                'id' => $e->id,
                'event_type' => $e->event_type->value,
                'severity' => $e->severity->value,
                'risk_points' => $e->risk_points,
                'ip_address' => $e->ip_address,
                'created_at' => $e->created_at,
                'resolved' => $e->resolved,
            ]);

        $riskScore = $this->riskEngine->getCurrentScore($userId, null);

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'login_id' => $user->login_id,
                ],
                'risk_score' => $riskScore,
                'risk_level' => \App\Enums\Security\RiskLevel::fromScore($riskScore)->value,
                'devices' => $devices,
                'active_sessions' => $activeSessions,
                'recent_events' => $recentEvents,
            ],
        ]);
    }

    public function trustDevice(Request $request, string $userId): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $validated = $request->validate([
            'device_id' => ['required', 'string', 'exists:security_devices,id'],
        ]);

        $this->deviceManager->trust($validated['device_id'], $userId);

        return response()->json(['message' => 'Device trusted.']);
    }
}
