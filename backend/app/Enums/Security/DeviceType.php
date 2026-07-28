<?php

namespace App\Enums\Security;

enum DeviceType: string
{
    case Desktop = 'desktop';
    case Mobile = 'mobile';
    case Tablet = 'tablet';
    case Unknown = 'unknown';
}
