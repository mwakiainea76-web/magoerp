# Security Architecture

## Authentication

**Laravel Sanctum** provides token-based authentication for the SPA.

### Token Flow

1. User submits `POST /api/login` with `login_id` and `password`
2. Server validates credentials against `users` table
3. Server creates a Sanctum token via `$user->createToken('api-token')`
4. Token is returned in response body AND set as `magoerp_auth_token` cookie
5. Frontend stores token in Zustand store (`localStorage`)
6. Subsequent requests attach token via `Authorization: Bearer {token}` header
7. The `AuthenticateApiTokenCookie` middleware can also read the token from the cookie

### Rate Limiting (Login)

- **Strategy**: Keyed by `login_id|IP` combination
- **Limit**: 5 attempts per minute
- **Implementation**: `ensureNotRateLimited()` in `AuthController`
- **Response**: `429 Too Many Requests` when exceeded

### Password Reset Enforcement

- Users created by admin have `must_reset_password = true`
- `EnsurePasswordResetComplete` middleware returns `423 Locked` for all endpoints except:
  - `GET /api/me`
  - `POST /api/change-password`
  - `POST /api/logout`
- Frontend `RequireAuth` redirects to `/reset-password` when `must_reset_password` is true

---

## Authorization

**Spatie Laravel Permission v6** with UUID support.

### Architecture

```
Users → (morph) → ModelHasRoles → Roles
                                 → ModelHasPermissions (direct permissions)
                                 → RoleHasPermissions → Permissions
```

### Permission Naming Convention

All permissions follow the pattern `{resource}.{action}`:

| Permission | Grants |
|---|---|
| `students.view` | View student list and details |
| `students.create` | Create new students |
| `students.update` | Edit existing students |
| `students.delete` | Delete students |
| `staff.view` | View staff directory |
| `staff.create` | Create staff; view meta info |
| `staff.update` | Edit staff records |
| `staff.delete` | Delete staff |
| `dashboard.view` | View admin/trainer dashboard |
| `institution.view` | View institution details |
| `institution.create` | Create institutions |
| `institution.update` | Update institution + system config |
| `institution.delete` | Delete institutions |
| `manage-roles` | Manage access roles |
| `manage-certification-authorities` | Manage certification |
| `manage-support-requests` | Admin support requests |
| `finance.view` | View finance dashboard |
| `finance.create` | Create invoices, payments |
| `finance.update` | Update finance records |
| `manage-enrollments` | Manage operations/enrollments |
| `manage-timetables` | Manage timetables |
| `manage-attendance` | Manage attendance |

Super-admin role exists but is excluded from API lists. All routes check permissions either via:
- `->middleware('permission:xxx')` in route definitions
- `$this->authorize('xxx')` or `$request->user()->can('xxx')` in controllers

---

## Security Middleware Pipeline

Every authenticated request passes through this pipeline (in order):

```
1. api_token_cookie
   └── Reads magoerp_auth_token cookie → sets Authorization header if absent

2. auth:sanctum
   └── Validates Bearer token → authenticates user

3. EnsurePasswordResetComplete
   └── Blocks requests if must_reset_password is true (except /me, /change-password, /logout)

4. security.track-device
   └── Fingerprints the device → SecurityUserDevice
   └── Uses User-Agent + Accept-Language + Accept headers

5. security.track-session
   └── Creates/updates SecurityUserSession
   └── Records IP, device, last_activity

6. security.assess
   └── RiskEngine::assess() → checks scores for user, IP, device
   └── Blocks request if score exceeds threshold

7. security.analyze
   └── BehaviorAnalyzer::analyze() → checks repeated failures
   └── Increments failure counters → triggers events on threshold
```

---

## Behavior Analysis

**Service**: `BehaviorAnalyzer`

Tracks and responds to repeated suspicious behaviors:

### Checked Patterns

- Login failures (per user)
- Rate limit violations (per IP)
- Blocked request attempts
- Suspicious device access

### How It Works

1. Each user/IP has a cache key with a failure counter
2. `BehaviorAnalyzer::analyze()` checks the current request against known patterns
3. When failures exceed thresholds, a `SecurityEvent` is recorded
4. `RiskEngine` assigns a risk score to the entity

### Recent Fixes

- Login failures are now tracked (previously the login path was skipped)
- Failure counter uses atomic `Cache::increment()` instead of read-then-write
- Threshold events use correct type (`SuspiciousActivity` instead of `BlockedRequest`)

---

## Risk Engine

**Service**: `RiskEngine`

### Scoring

- **Base score**: 0 (no risk)
- **Score accumulation**: +5 per anomalous event
- **Score decay**: 2 points per minute (time-based, not request-based)
- **Storage**: `Cache::put('security.risk.{entity_type}.{entity_id}', ['score' => N, 'ts' => Carbon])`
- **Threshold**: Configurable via `config/security.php`

### Assessment

When `assess()` is called:
1. Retrieves current score from cache
2. Applies time-based decay based on elapsed minutes since `ts`
3. If decayed score > threshold → blocks the request
4. Returns the assessed entity for event tracking

### Fix Applied

Changed from call-based decay (5 pts deducted per request) to time-based decay (2 pts per minute). This prevents rapid legitimate requests from clearing risk scores quickly.

---

## Session Management

**Service**: `SessionManager`

### Features

- List all active sessions for the authenticated user
- View session details (device, IP, last activity)
- Terminate a single session
- Terminate all other sessions (except current)
- Admin can terminate all sessions for any user

### Cache Integration

When admin terminates all sessions for a user, each session's cache key is explicitly invalidated to ensure the termination takes effect immediately, regardless of cache driver.

### Device Tracking

- Devices are identified by a fingerprint hash derived from `User-Agent`, `Accept-Language`, and `Accept` headers
- Each device gets a `SecurityUserDevice` record
- Devices can be renamed by the user for identification
- Devices can be blocked by admin

---

## Security Events

**Service**: `SecurityEventService`

### Event Types

| Event Type | Description |
|---|---|
| `LoginSuccess` | Successful authentication |
| `LoginFailed` | Failed login attempt |
| `Logout` | User logout |
| `PasswordChanged` | Password change |
| `SessionTerminated` | Session ended |
| `AllOtherSessionsTerminated` | Bulk session termination |
| `DeviceBlocked` | Device blocked by admin |
| `UserBlocked` | User blocked by admin |
| `IpBlocked` | IP address blocked |
| `SuspiciousActivity` | Behavior threshold exceeded |
| `RateLimited` | Rate limit triggered |
| `BlockedRequest` | Request blocked by risk engine |
| `RiskScoreChanged` | Risk score crossed a threshold |

### Event Storage

Events are stored in the `security_events` table with:
- `user_id` (nullable — unauthenticated events like login failures have no user)
- `event_type`
- `description`
- `metadata` (JSON — IP, device, user agent, etc.)
- `ip_address`
- `user_agent`
- `severity` (info, warning, critical)

---

## API Monitoring

### Tracked Metrics

- Per-endpoint request counts
- Response times
- Error rates
- Status code distributions

### Middleware

**`api.monitor`** is applied to all API routes (including public ones) and records:
- Method, URI, status code
- Duration (in milliseconds)
- Timestamp
- IP address (anonymized)

Data is stored in the `api_monitoring_logs` table and viewable from the Security Dashboard.

---

## Security Configuration

File: `config/security.php`

```php
return [
    'risk' => [
        'score_threshold' => env('SECURITY_RISK_SCORE_THRESHOLD', 50),
        'decay_rate_per_minute' => 2,
    ],
    'behavior' => [
        'failed_login_threshold' => env('SECURITY_FAILED_LOGIN_THRESHOLD', 5),
        'rate_limit_threshold' => env('SECURITY_RATE_LIMIT_THRESHOLD', 10),
    ],
    'session' => [
        'lifetime_minutes' => env('SESSION_LIFETIME_MINUTES', 1440), // 24 hours
    ],
];
```

---

## Frontend Security

- **401 interception**: `authClient` response interceptor detects 401 responses and redirects to `/login`
- **Password reset enforcement**: `RequireAuth` checks `must_reset_password` and redirects to `/reset-password`
- **Role-based route loading**: Only the current role's route bundle is loaded — other routes are not accessible
- **Permission checking**: `useAuthStore.can(permission)` checks the user's permission array before showing UI elements
- **Token storage**: Token in localStorage (Zustand persist), sent as Bearer header on every request
