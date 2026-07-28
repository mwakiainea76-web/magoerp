# Security API

Base URL: `/api`

All endpoints require `auth:sanctum` and pass through the security middleware pipeline.

---

## Sessions

### GET /security/sessions

List active sessions for the authenticated user.

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "device": { "name": "Chrome on Windows", "fingerprint": "abc123" },
      "ip_address": "192.168.1.100",
      "last_activity": "2026-07-28T12:00:00Z",
      "is_current": true
    }
  ]
}
```

### DELETE /security/sessions/others

Terminate all other sessions (excluding the current one).

**Response (200)**:
```json
{
  "message": "All other sessions terminated.",
  "terminated_count": 3
}
```

### DELETE /security/sessions/{session}

Terminate a single session.

**Response (200)**:
```json
{
  "message": "Session terminated."
}
```

### POST /security/sessions/close-all/{user}

Admin: terminate all sessions for a specific user. Invalidates per-session cache keys.

**Permissions**: `staff.delete`

**Response (200)**:
```json
{
  "message": "All sessions terminated for user."
}
```

---

## Devices

### GET /security/devices

List registered devices for the authenticated user.

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Office Desktop",
      "fingerprint": "abc123",
      "last_ip": "192.168.1.100",
      "last_used_at": "2026-07-28T12:00:00Z",
      "is_current": true
    }
  ]
}
```

### PUT /security/devices/{device}

Rename a device for identification.

**Body**:
```json
{
  "name": "Home Laptop"
}
```

### DELETE /security/devices/{device}

Remove a trusted device record.

---

## Security Events

### GET /security/events

List security events with pagination and filtering.

**Permissions**: `security.view`

**Query Parameters**: `page`, `per_page`, `event_type`, `severity`, `user_id`, `date_from`, `date_to`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "login_id": "john.doe" },
      "event_type": "LoginFailed",
      "description": "Failed login attempt for john.doe",
      "ip_address": "192.168.1.100",
      "severity": "warning",
      "created_at": "2026-07-28T11:55:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 20,
    "total": 45
  }
}
```

### GET /security/event-types

List available event types for filtering.

---

## Blocked Entities

### GET /security/blocked-ips
### GET /security/blocked-devices
### GET /security/blocked-users

List blocked entities with pagination.

### POST /security/blocked-ips
### POST /security/blocked-devices
### POST /security/blocked-users

Block an entity.

**Body** (blocked-ips example):
```json
{
  "ip_address": "10.0.0.5",
  "reason": "Suspicious activity detected"
}
```

### DELETE /security/blocked-ips/{id}
### DELETE /security/blocked-devices/{id}
### DELETE /security/blocked-users/{id}

Unblock an entity.

---

## API Monitoring

### GET /security/api-monitoring

View API request metrics.

**Permissions**: `security.view`

**Query Parameters**: `page`, `per_page`, `endpoint`, `status_code`, `date_from`, `date_to`, `sort_by`, `sort_direction`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "method": "POST",
      "uri": "/api/login",
      "status_code": 200,
      "duration_ms": 145,
      "ip_address": "192.168.1.100",
      "created_at": "2026-07-28T12:00:00Z"
    }
  ],
  "meta": { ... }
}
```

---

## Security Dashboard

### GET /security/dashboard

Security overview with KPIs.

**Permissions**: `security.view`

**Response**:
```json
{
  "stats": {
    "total_events_today": 120,
    "failed_logins_today": 5,
    "active_sessions": 45,
    "blocked_ips": 3,
    "blocked_devices": 1,
    "blocked_users": 0
  },
  "recent_events": [...],
  "events_by_type": { "LoginSuccess": 100, "LoginFailed": 5, ... },
  "events_timeline": [...]
}
```

---

## User Profile

### GET /security/user-profile

Security profile for the authenticated user (sessions, devices, recent events).

**Response**:
```json
{
  "sessions": [...],
  "devices": [...],
  "recent_events": [...],
  "risk_score": 12
}
```

---

## Event Types Reference

| Event Type | Severity | Trigger |
|---|---|---|
| `LoginSuccess` | info | Successful login |
| `LoginFailed` | warning | Failed login attempt |
| `Logout` | info | User logout |
| `PasswordChanged` | info | Password change |
| `SessionTerminated` | info | Session ended by user |
| `AllOtherSessionsTerminated` | info | Bulk session termination |
| `DeviceBlocked` | warning | Device blocked by admin |
| `UserBlocked` | critical | User blocked by admin |
| `IpBlocked` | warning | IP blocked by admin |
| `SuspiciousActivity` | critical | Behavior threshold exceeded |
| `RateLimited` | warning | Rate limit triggered |
| `BlockedRequest` | critical | Request blocked by risk engine |
| `RiskScoreChanged` | warning | Risk score crossed a threshold |
