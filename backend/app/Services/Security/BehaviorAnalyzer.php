<?php

namespace App\Services\Security;

use App\Enums\Security\SecurityEventType;
use App\Enums\Security\Severity;
use App\Security\DTO\SecurityEventDTO;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BehaviorAnalyzer
{
    private const FREQUENCY_WINDOW_MINUTES = 1;
    private const FREQUENCY_THRESHOLD = 30;

    public function __construct(
        private readonly RiskEngine $riskEngine,
        private readonly SecurityEventService $eventService,
    ) {}

    public function analyze(Request $request): void
    {
        $userId = $request->user()?->id;

        if (!$userId) {
            return;
        }

        $this->analyzeRaw(
            userId: $userId,
            deviceId: $request->attributes->get('security_device_id'),
            sessionId: $request->attributes->get('security_session_id'),
            ip: $request->ip(),
            path: $request->path(),
            method: $request->method(),
        );
    }

    public function analyzeRaw(
        string $userId,
        ?string $deviceId,
        ?string $sessionId,
        ?string $ip,
        string $path,
        string $method,
    ): void
    {
        $this->checkRequestFrequency($userId, $deviceId, $sessionId, $ip);
        $this->checkRepeatedFailures($userId, $deviceId, $sessionId, $ip, $path, $method);
    }

    private function checkRequestFrequency(string $userId, ?string $deviceId, ?string $sessionId, ?string $ip): void
    {
        $cacheKey = "behavior:freq:{$userId}";
        $count = (int) Cache::get($cacheKey, 0);
        $count++;

        $ttl = Cache::ttl($cacheKey);
        if ($ttl < 0) {
            Cache::put($cacheKey, $count, now()->addMinutes(self::FREQUENCY_WINDOW_MINUTES));
        } else {
            Cache::increment($cacheKey);
        }

        if ($count >= self::FREQUENCY_THRESHOLD) {
            $event = new SecurityEventDTO(
                eventType: SecurityEventType::RateLimitExceeded,
                riskPoints: 20,
                severity: Severity::Medium,
                userId: $userId,
                deviceId: $deviceId,
                sessionId: $sessionId,
                ipAddress: $ip,
                metadata: ['request_count' => $count, 'window_minutes' => self::FREQUENCY_WINDOW_MINUTES],
            );

            $this->eventService->log($event);
        }
    }

    private function checkRepeatedFailures(string $userId, ?string $deviceId, ?string $sessionId, ?string $ip, string $path, string $method): void
    {
        $endpointKey = "behavior:endpoint:{$userId}:" . hash('sha256', "{$method}:{$path}");
        $count = Cache::increment($endpointKey, 1);

        if ($count === 1) {
            Cache::put($endpointKey, 1, now()->addMinutes(5));
        }

        if ($count > 0 && $count % 10 === 0) {
            $this->eventService->log(new SecurityEventDTO(
                eventType: SecurityEventType::SuspiciousActivity,
                riskPoints: 10,
                severity: Severity::Low,
                userId: $userId,
                deviceId: $deviceId,
                sessionId: $sessionId,
                ipAddress: $ip,
                metadata: ['path' => $path, 'method' => $method, 'request_count' => $count],
            ));
        }
    }
}
