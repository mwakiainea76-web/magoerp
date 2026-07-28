<?php

namespace App\Services\Security;

use App\Models\SecurityBlockedDevice;
use App\Models\SecurityDevice;
use App\Models\SecurityTrustedDevice;
use App\Security\DTO\DeviceDTO;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class DeviceManager
{
    public function __construct(
        private readonly SecurityEventService $eventService,
    ) {}

    public function register(DeviceDTO $dto, ?string $userId = null): SecurityDevice
    {
        $cacheKey = 'device:uuid:' . $dto->uuid;

        $deviceId = Cache::remember($cacheKey, 3600, function () use ($dto, $userId) {
            $device = SecurityDevice::firstOrCreate(
                ['uuid' => $dto->uuid],
                [
                    'fingerprint_hash' => $dto->fingerprintHash,
                    'browser' => $dto->browser,
                    'browser_version' => $dto->browserVersion,
                    'platform' => $dto->platform,
                    'operating_system' => $dto->operatingSystem,
                    'device_type' => $dto->deviceType ?? 'unknown',
                    'language' => $dto->language,
                    'timezone' => $dto->timezone,
                    'screen_resolution' => $dto->screenResolution,
                    'user_agent' => $dto->userAgent,
                    'user_id' => $userId,
                    'first_seen_at' => now(),
                    'last_seen_at' => now(),
                ],
            );

            if ($device->wasRecentlyCreated) {
                $this->eventService->logNewDevice($device, $userId);
            }

            return $device->id;
        });

        $device = SecurityDevice::find($deviceId);

        $seenKey = 'device:seen:' . $deviceId;
        if (!Cache::has($seenKey)) {
            $device->updateQuietly(['last_seen_at' => now()]);
            Cache::put($seenKey, true, now()->addMinutes(5));
        }

        return $device;
    }

    public function isBlocked(string $deviceId): bool
    {
        $cacheKey = 'device:blocked:' . $deviceId;

        return Cache::remember($cacheKey, 300, function () use ($deviceId) {
            return SecurityBlockedDevice::where('device_id', $deviceId)
                ->where(fn ($q) => $q->whereNull('blocked_until')->orWhere('blocked_until', '>', now()))
                ->exists();
        });
    }

    public function isTrusted(string $deviceId, string $userId): bool
    {
        return SecurityTrustedDevice::where('device_id', $deviceId)
            ->where('user_id', $userId)
            ->exists();
    }

    public function trust(string $deviceId, string $userId): void
    {
        SecurityTrustedDevice::updateOrCreate(
            ['device_id' => $deviceId, 'user_id' => $userId],
            ['trusted_at' => now()],
        );

        SecurityDevice::where('id', $deviceId)->update(['is_trusted' => true]);
    }

    public function generateUuid(): string
    {
        return (string) Str::uuid();
    }
}
