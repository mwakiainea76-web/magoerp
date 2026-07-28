<?php

namespace App\Services\Security;

use App\Enums\Security\SecurityEventType;
use App\Enums\Security\Severity;
use App\Models\SecurityEvent;
use App\Security\DTO\SecurityEventDTO;
use Illuminate\Support\Facades\DB;

class SecurityEventService
{
    public function log(SecurityEventDTO $dto): SecurityEvent
    {
        return SecurityEvent::create([
            'user_id' => $dto->userId,
            'device_id' => $dto->deviceId,
            'session_id' => $dto->sessionId,
            'ip_address' => $dto->ipAddress,
            'event_type' => $dto->eventType,
            'risk_points' => $dto->riskPoints,
            'severity' => $dto->severity,
            'metadata' => $dto->metadata,
        ]);
    }

    public function logNewDevice($device, ?string $userId): SecurityEvent
    {
        return $this->log(new SecurityEventDTO(
            eventType: SecurityEventType::NewDevice,
            riskPoints: 15,
            severity: Severity::Low,
            userId: $userId,
            deviceId: $device->id,
            metadata: [
                'device_uuid' => $device->uuid,
                'browser' => $device->browser,
                'platform' => $device->platform,
            ],
        ));
    }

    public function logLoginSuccess(string $userId, ?string $deviceId, ?string $sessionId, ?string $ip): SecurityEvent
    {
        return $this->log(new SecurityEventDTO(
            eventType: SecurityEventType::LoginSuccess,
            riskPoints: 0,
            severity: Severity::Low,
            userId: $userId,
            deviceId: $deviceId,
            sessionId: $sessionId,
            ipAddress: $ip,
        ));
    }

    public function logLoginFailed(?string $userId, ?string $deviceId, ?string $ip): SecurityEvent
    {
        return $this->log(new SecurityEventDTO(
            eventType: SecurityEventType::LoginFailed,
            riskPoints: 10,
            severity: Severity::Low,
            userId: $userId,
            deviceId: $deviceId,
            ipAddress: $ip,
        ));
    }

    public function resolve(string $id): bool
    {
        return (bool) SecurityEvent::where('id', $id)->update(['resolved' => true]);
    }

    public function getStats(): array
    {
        $today = now()->startOfDay();

        return [
            'failed_logins_today' => SecurityEvent::where('event_type', SecurityEventType::LoginFailed)
                ->where('created_at', '>=', $today)
                ->count(),

            'total_events_today' => SecurityEvent::where('created_at', '>=', $today)->count(),

            'high_risk_events' => SecurityEvent::whereIn('severity', [Severity::High, Severity::Critical])
                ->where('resolved', false)
                ->count(),

            'events_by_severity' => SecurityEvent::select('severity', DB::raw('count(*) as count'))
                ->groupBy('severity')
                ->pluck('count', 'severity')
                ->toArray(),

            'events_by_type' => SecurityEvent::select('event_type', DB::raw('count(*) as count'))
                ->groupBy('event_type')
                ->orderByDesc('count')
                ->limit(10)
                ->pluck('count', 'event_type')
                ->toArray(),

            'recent' => SecurityEvent::with('user')
                ->latest()
                ->take(20)
                ->get()
                ->toArray(),
        ];
    }
}
