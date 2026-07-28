<?php

namespace App\Http\Middleware\Security;

use App\Security\DTO\DeviceDTO;
use App\Services\Security\DeviceManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class TrackDevice
{
    public function __construct(
        private readonly DeviceManager $deviceManager,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        try {
            $cookieName = config('security.device.cookie_name', 'magoerp_device_uuid');
            $deviceUuid = $request->cookie($cookieName);

            if (!$deviceUuid) {
                $deviceUuid = $this->deviceManager->generateUuid();
            }

            $userAgent = $request->userAgent();
            $dto = new DeviceDTO(
                uuid: $deviceUuid,
                browser: $this->extractBrowser($userAgent),
                browserVersion: null,
                platform: $this->detectPlatform($userAgent),
                operatingSystem: $this->extractOs($userAgent),
                deviceType: $this->detectDeviceType($userAgent),
                language: $request->getPreferredLanguage(),
                timezone: $request->header('X-Timezone'),
                screenResolution: $request->header('X-Screen-Resolution'),
                userAgent: $userAgent,
                fingerprintHash: $request->header('X-Device-Fingerprint'),
            );

            $userId = $request->user()?->id;
            $device = $this->deviceManager->register($dto, $userId);

            if ($this->deviceManager->isBlocked($device->id)) {
                return response()->json(['message' => 'Device is blocked.'], 423);
            }

            $request->attributes->set('security_device_id', $device->id);
            $request->attributes->set('security_device_uuid', $device->uuid);
            $request->attributes->set('security_device_browser', $dto->browser);
            $request->attributes->set('security_device_os', $dto->operatingSystem);
            $request->attributes->set('security_device_type', $dto->deviceType);

            $response = $next($request);

            if (!$request->cookies->has($cookieName)) {
                $ttl = config('security.device.cookie_ttl_years', 5) * 365 * 24 * 60;
                $response->headers->setCookie(
                    cookie($cookieName, $deviceUuid, $ttl, '/', null, false, true, false, 'lax')
                );
            }

            return $response;
        } catch (\Throwable $e) {
            Log::error('Security TrackDevice failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
                'path' => $request->path(),
            ]);

            $response = $next($request);
            $response->headers->set('X-Security-TrackDevice', 'error');

            return $response;
        } finally {
            $elapsed = (microtime(true) - $start) * 1000;
            if (isset($response)) {
                $response->headers->set('X-Security-TrackDevice-Ms', round($elapsed, 1));
            }
        }
    }

    private function extractBrowser(?string $ua): ?string
    {
        if (!$ua) return null;
        if (str_contains($ua, 'Chrome')) return 'Chrome';
        if (str_contains($ua, 'Firefox')) return 'Firefox';
        if (str_contains($ua, 'Safari')) return 'Safari';
        if (str_contains($ua, 'Edge')) return 'Edge';
        if (str_contains($ua, 'Opera')) return 'Opera';
        return 'Unknown';
    }

    private function extractOs(?string $ua): ?string
    {
        if (!$ua) return null;
        if (str_contains($ua, 'Windows')) return 'Windows';
        if (str_contains($ua, 'Mac OS')) return 'macOS';
        if (str_contains($ua, 'Linux')) return 'Linux';
        if (str_contains($ua, 'Android')) return 'Android';
        if (str_contains($ua, 'iOS') || str_contains($ua, 'iPhone')) return 'iOS';
        return 'Unknown';
    }

    private function detectPlatform(?string $ua): ?string
    {
        if (!$ua) return null;
        if (str_contains($ua, 'Win')) return 'Windows';
        if (str_contains($ua, 'Mac')) return 'Mac';
        if (str_contains($ua, 'Linux')) return 'Linux';
        if (str_contains($ua, 'Android')) return 'Android';
        if (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) return 'iOS';
        return 'Unknown';
    }

    private function detectDeviceType(?string $ua): string
    {
        if (!$ua) return 'unknown';
        if (str_contains($ua, 'Mobile') || str_contains($ua, 'Android')) return 'mobile';
        if (str_contains($ua, 'Tablet') || str_contains($ua, 'iPad')) return 'tablet';
        return 'desktop';
    }
}
