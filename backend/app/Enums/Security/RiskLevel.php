<?php

namespace App\Enums\Security;

enum RiskLevel: string
{
    case Normal = 'normal';
    case Throttle = 'throttle';
    case Captcha = 'captcha';
    case Mfa = 'mfa';
    case Locked = 'locked';

    public static function fromScore(int $score): self
    {
        return match (true) {
            $score > 100 => self::Locked,
            $score > 80  => self::Mfa,
            $score > 60  => self::Captcha,
            $score > 30  => self::Throttle,
            default      => self::Normal,
        };
    }

    public function threshold(): int
    {
        return match ($this) {
            self::Normal   => 30,
            self::Throttle => 60,
            self::Captcha  => 80,
            self::Mfa      => 100,
            self::Locked   => PHP_INT_MAX,
        };
    }
}
