<?php

namespace App\Http\Middleware\Security;

use App\Enums\Security\RiskLevel;
use App\Enums\Security\SecurityEventType;
use App\Enums\Security\Severity;
use App\Security\DTO\SecurityEventDTO;
use App\Services\Security\RiskEngine;
use App\Services\Security\SecurityEventService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class SecurityAssessment
{
    public function __construct(
        private readonly RiskEngine $riskEngine,
        private readonly SecurityEventService $eventService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        try {
            $userId = $request->user()?->id;
            $deviceId = $request->attributes->get('security_device_id');

            if (!$userId) {
                $response = $next($request);
                return $response;
            }

            $risk = $this->riskEngine->getDecayedScore($userId, $deviceId);

            if ($risk > 100) {
                $this->eventService->log(new SecurityEventDTO(
                    eventType: SecurityEventType::BlockedRequest,
                    riskPoints: 0,
                    severity: Severity::High,
                    userId: $userId,
                    deviceId: $deviceId,
                    sessionId: $request->attributes->get('security_session_id'),
                    ipAddress: $request->ip(),
                    metadata: ['reason' => 'risk_score_exceeded', 'score' => $risk],
                ));

                return response()->json([
                    'message' => 'Request blocked due to security risk.',
                    'risk_score' => $risk,
                ], 423);
            }

            $riskLevel = RiskLevel::fromScore($risk);
            $request->attributes->set('security_risk_score', $risk);
            $request->attributes->set('security_risk_level', $riskLevel->value);

            $response = $next($request);
            $response->headers->set('X-Risk-Score', (string) $risk);
            $response->headers->set('X-Risk-Level', $riskLevel->value);

            return $response;
        } catch (\Throwable $e) {
            Log::error('Security Assessment failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
                'path' => $request->path(),
            ]);

            $response = $next($request);
            $response->headers->set('X-Security-Assessment', 'error');

            return $response;
        } finally {
            if (isset($response)) {
                $elapsed = (microtime(true) - $start) * 1000;
                $response->headers->set('X-Security-Assessment-Ms', round($elapsed, 1));
            }
        }
    }
}
