<?php

namespace App\Enums\Security;

enum SecurityEventType: string
{
    case LoginSuccess = 'login_success';
    case LoginFailed = 'login_failed';
    case Logout = 'logout';
    case PasswordReset = 'password_reset';
    case NewDevice = 'new_device';
    case DeviceRemoved = 'device_removed';
    case RoleChanged = 'role_changed';
    case PermissionChanged = 'permission_changed';
    case BlockedRequest = 'blocked_request';
    case RateLimitExceeded = 'rate_limit_exceeded';
    case ImpossibleTravel = 'impossible_travel';
    case AccountLocked = 'account_locked';
    case AccountUnlocked = 'account_unlocked';
    case MassExport = 'mass_export';
    case SensitiveAction = 'sensitive_action';
    case ConcurrentSessionDetected = 'concurrent_session_detected';
    case FreshAuthRequired = 'fresh_auth_required';
}
