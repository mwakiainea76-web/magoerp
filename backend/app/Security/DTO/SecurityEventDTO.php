<?php

namespace App\Security\DTO;

use App\Enums\Security\SecurityEventType;
use App\Enums\Security\Severity;

readonly class SecurityEventDTO
{
    public function __construct(
        public SecurityEventType $eventType,
        public int               $riskPoints,
        public Severity          $severity,
        public ?string           $userId = null,
        public ?string           $deviceId = null,
        public ?string           $sessionId = null,
        public ?string           $ipAddress = null,
        public ?array            $metadata = null,
    ) {}
}
