<?php

namespace App\Security\DTO;

use App\Enums\Security\RiskLevel;

readonly class RiskAssessmentDTO
{
    public function __construct(
        public int       $score,
        public RiskLevel $level,
        public array     $triggeredRules = [],
    ) {}

    public function shouldBlock(): bool
    {
        return $this->level === RiskLevel::Locked;
    }

    public function shouldThrottle(): bool
    {
        return $this->level === RiskLevel::Throttle || $this->level === RiskLevel::Locked;
    }
}
