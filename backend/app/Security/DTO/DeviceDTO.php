<?php

namespace App\Security\DTO;

readonly class DeviceDTO
{
    public function __construct(
        public string  $uuid,
        public ?string $browser,
        public ?string $browserVersion,
        public ?string $platform,
        public ?string $operatingSystem,
        public ?string $deviceType,
        public ?string $language,
        public ?string $timezone,
        public ?string $screenResolution,
        public ?string $userAgent,
        public ?string $fingerprintHash = null,
    ) {}
}
