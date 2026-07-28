<?php

namespace App\Services\Security;

use App\Models\SecurityUserSession;
use App\Security\DTO\SessionDTO;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class SessionManager
{
    public function __construct(
        private readonly SecurityEventService $eventService,
    ) {}

    public function create(SessionDTO $dto): SecurityUserSession
    {
        $activeCount = SecurityUserSession::where('user_id', $dto->userId)
            ->where('is_active', true)
            ->count();

        if ($activeCount > 0) {
            $this->detectConcurrentSessions($dto->userId, $dto->deviceId, $dto->sessionId);
        }

        return SecurityUserSession::create([
            'user_id' => $dto->userId,
            'device_id' => $dto->deviceId,
            'session_id' => $dto->sessionId,
            'ip_address' => $dto->ipAddress,
            'country' => $dto->country,
            'city' => $dto->city,
            'browser' => $dto->browser,
            'operating_system' => $dto->operatingSystem,
            'login_at' => now(),
            'last_activity' => now(),
            'is_active' => true,
        ]);
    }

    public function findActive(string $sessionId): ?SecurityUserSession
    {
        $cacheKey = 'session:active:' . $sessionId;

        return Cache::remember($cacheKey, 300, function () use ($sessionId) {
            return SecurityUserSession::where('session_id', $sessionId)
                ->where('is_active', true)
                ->first();
        });
    }

    public function updateActivity(string $sessionId): void
    {
        $throttleKey = 'session:activity:' . $sessionId;
        if (Cache::has($throttleKey)) {
            return;
        }

        SecurityUserSession::where('session_id', $sessionId)
            ->where('is_active', true)
            ->update(['last_activity' => now()]);

        Cache::put($throttleKey, true, now()->addMinutes(2));
    }

    public function close(string $sessionId): void
    {
        SecurityUserSession::where('session_id', $sessionId)
            ->update([
                'is_active' => false,
                'logout_at' => now(),
            ]);

        Cache::forget('session:active:' . $sessionId);
        Cache::forget('session:activity:' . $sessionId);
    }

    public function closeAllForUser(string $userId, ?string $exceptSessionId = null): int
    {
        $affected = SecurityUserSession::where('user_id', $userId)
            ->where('is_active', true)
            ->when($exceptSessionId, fn ($q) => $q->where('session_id', '!=', $exceptSessionId))
            ->get();

        $count = $affected->count();
        if ($count === 0) {
            return 0;
        }

        SecurityUserSession::whereIn('id', $affected->pluck('id'))->update([
            'is_active' => false,
            'logout_at' => now(),
        ]);

        foreach ($affected as $session) {
            Cache::forget('session:active:' . $session->session_id);
            Cache::forget('session:activity:' . $session->session_id);
        }

        return $count;
    }

    public function getActiveSessions(string $userId): array
    {
        return SecurityUserSession::with('device')
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->orderByDesc('last_activity')
            ->get()
            ->toArray();
    }

    public function countActiveForUser(string $userId): int
    {
        return SecurityUserSession::where('user_id', $userId)
            ->where('is_active', true)
            ->count();
    }

    public function detectConcurrentSessions(string $userId, ?string $deviceId, string $currentSessionId): void
    {
        $activeSessions = SecurityUserSession::with('device')
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->where('session_id', '!=', $currentSessionId)
            ->get();

        if ($activeSessions->isEmpty()) {
            return;
        }

        $differentDevices = $activeSessions->filter(fn ($s) => $s->device_id !== $deviceId);
        $differentIps = $activeSessions->pluck('ip_address')->filter()->unique()->values();

        if ($differentDevices->isNotEmpty() || $differentIps->count() > 1) {
            $this->eventService->log(new \App\Security\DTO\SecurityEventDTO(
                eventType: \App\Enums\Security\SecurityEventType::ConcurrentSessionDetected,
                riskPoints: 15,
                severity: \App\Enums\Security\Severity::Medium,
                userId: $userId,
                deviceId: $deviceId,
                sessionId: $currentSessionId,
                metadata: [
                    'active_sessions' => $activeSessions->count(),
                    'different_devices' => $differentDevices->count(),
                    'ips' => $differentIps,
                ],
            ));
        }
    }
}
