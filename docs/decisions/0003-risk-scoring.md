# ADR 0003: Security Risk Scoring Algorithm

**Status**: Accepted  
**Date**: 2026-07-28  
**Author**: System Audit

---

## Context

The security module needs a risk scoring system to identify potentially malicious user behavior. The system must:
- Score user actions in real-time
- Decay scores over time (old actions should matter less)
- Be efficient enough to run on every request
- Work with the `file` cache driver

---

## Decision

Use a time-based decay algorithm with a flat 2-point-per-minute decay rate.

### Algorithm

```php
function getRiskScore($userId): float {
    $data = Cache::get("risk_score_{$userId}", ['score' => 0, 'ts' => time()]);
    
    // Decay: 2 points per minute since last update
    $elapsed = time() - $data['ts'];
    $decay = $elapsed * 2 / 60;
    
    $data['score'] = max(0, $data['score'] - $decay);
    $data['ts'] = time();
    
    Cache::put("risk_score_{$userId}", $data, 600); // 10 min TTL
    
    return $data['score'];
}

function addRiskScore($userId, $points): float {
    $data = Cache::get("risk_score_{$userId}", ['score' => 0, 'ts' => time()]);
    
    // Apply decay before adding new points
    $elapsed = time() - $data['ts'];
    $decay = $elapsed * 2 / 60;
    $data['score'] = max(0, $data['score'] - $decay) + $points;
    $data['ts'] = time();
    
    Cache::put("risk_score_{$userId}", $data, 600);
    
    return $data['score'];
}
```

### Storage Format

Each cache entry stores a tuple: `['score' => float, 'ts' => int]`

- `score`: Current risk score (decayed)
- `ts`: Unix timestamp of last update

### Point Assignments

| Event | Points |
|---|---|
| Failed login | +10 |
| Login from new device | +5 |
| Login from new location | +8 |
| Multiple sessions | +3 |
| Password change | +2 |
| Profile change | +1 |
| Rate limit hit | +15 |
| Suspicious parameter | +20 |

### Thresholds

| Score Range | Severity | Action |
|---|---|---|
| 0–20 | Low | Log only |
| 21–50 | Medium | Log + flag for review |
| 51–80 | High | Challenge (CAPTCHA/2FA) |
| 81+ | Critical | Block request + notify admin |

---

## Rationale

1. **Time-based decay** naturally weights recent activity more heavily than old activity, matching real-world risk patterns.
2. **Flat decay rate** is simple to compute and reason about (2 points/min = 120 points/hour).
3. **Tuple storage** avoids needing a separate database table or queue for decay calculations.
4. **Cache TTL of 10 min** balances memory usage against persistence; scores for inactive users naturally expire.

---

## Consequences

**Positive:**
- O(1) read and write — no database queries
- Self-cleaning — inactive users' scores expire from cache
- Deterministic and auditable

**Negative:**
- Score is lost if cache is cleared (resets to 0)
- File cache may have race conditions under extreme concurrent writes
- No historical persistence of score changes

---

## Alternatives Considered

1. **Database-backed scores** — More persistent but requires a scheduled job for decay and adds DB load on every request.
2. **Logarithmic decay** — More mathematically elegant but harder to explain and debug.
3. **Redis sorted sets** — Natural fit for time-series scoring but adds infrastructure dependency.
