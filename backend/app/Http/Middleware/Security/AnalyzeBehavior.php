<?php

namespace App\Http\Middleware\Security;

use App\Services\Security\BehaviorAnalyzer;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AnalyzeBehavior
{
    public function __construct(
        private readonly BehaviorAnalyzer $behaviorAnalyzer,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        try {
            $response = $next($request);

            $user = $request->user();
            if ($user) {
                $userId = $user->id;
                $deviceId = $request->attributes->get('security_device_id');
                $sessionId = $request->attributes->get('security_session_id');
                $ip = $request->ip();
                $path = $request->path();
                $method = $request->method();
                $analyzer = $this->behaviorAnalyzer;

                dispatch(function () use ($analyzer, $userId, $deviceId, $sessionId, $ip, $path, $method) {
                    try {
                        $analyzer->analyzeRaw(
                            userId: $userId,
                            deviceId: $deviceId,
                            sessionId: $sessionId,
                            ip: $ip,
                            path: $path,
                            method: $method,
                        );
                    } catch (\Throwable $e) {
                        Log::error('Security AnalyzeBehavior failed', [
                            'error' => $e->getMessage(),
                            'user_id' => $userId,
                        ]);
                    }
                })->afterResponse();
            }

            return $response;
        } catch (\Throwable $e) {
            Log::error('Security AnalyzeBehavior dispatch failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()?->id,
            ]);

            return $next($request);
        } finally {
            $elapsed = (microtime(true) - $start) * 1000;
            if (isset($response)) {
                $response->headers->set('X-Security-Analyze-Ms', round($elapsed, 1));
            }
        }
    }
}
