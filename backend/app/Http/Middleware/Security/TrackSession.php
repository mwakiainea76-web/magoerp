<?php

namespace App\Http\Middleware\Security;

use App\Security\DTO\SessionDTO;
use App\Services\Security\SessionManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class TrackSession
{
    public function __construct(
        private readonly SessionManager $sessionManager,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);
        $response = null;

        try {
            $user = $request->user();

            if (!$user) {
                $response = $next($request);
                return $response;
            }

            $sessionId = session()->getId();
            $deviceId = $request->attributes->get('security_device_id');

            $existingSession = $this->sessionManager->findActive($sessionId);

            if (!$existingSession) {
                $dto = new SessionDTO(
                    sessionId: $sessionId,
                    userId: $user->id,
                    deviceId: $deviceId,
                    ipAddress: $request->ip(),
                    country: $request->header('X-Country'),
                    city: $request->header('X-City'),
                    browser: $request->attributes->get('security_device_browser'),
                    operatingSystem: $request->attributes->get('security_device_os'),
                );

                $existingSession = $this->sessionManager->create($dto);
            } else {
                $this->sessionManager->updateActivity($sessionId);
            }

            $request->attributes->set('security_session_id', $sessionId);

            $response = $next($request);

            return $response;
        } catch (\Throwable $e) {
            Log::error('Security TrackSession failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
                'path' => $request->path(),
            ]);

            $response = $next($request);
            $response->headers->set('X-Security-TrackSession', 'error');

            return $response;
        } finally {
            if ($response !== null) {
                $elapsed = (microtime(true) - $start) * 1000;
                $response->headers->set('X-Security-TrackSession-Ms', round($elapsed, 1));
            }
        }
    }
}
