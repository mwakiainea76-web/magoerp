<?php

namespace App\Security\DTO;

readonly class SessionDTO
{
    public function __construct(
        public string  $sessionId,
        public string  $userId,
        public ?string $deviceId,
        public ?string $ipAddress,
        public ?string $country,
        public ?string $city,
        public ?string $browser,
        public ?string $operatingSystem,
    ) {}
}
