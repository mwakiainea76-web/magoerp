# ADR 0002: Cache Driver Choice (File)

**Status**: Accepted  
**Date**: 2026-07-28  
**Author**: System Audit

---

## Context

The application needs a caching layer for session data, security risk scores, permissions, and configuration settings. The available cache drivers in Laravel are: `file`, `database`, `redis`, `memcached`, `dynamodb`, and `array`.

---

## Decision

Use the `file` cache driver as the default for all environments.

### Configuration

```env
CACHE_DRIVER=file
```

Cache files are stored in `storage/framework/cache/data/` with the following structure:

```
storage/framework/cache/data/
  ff/  # Hex-prefix subdirectories for filesystem performance
    ff0123abc...  # Serialized cache entries
```

---

## Rationale

1. **Zero external dependencies** — No need for Redis, Memcached, or other services.
2. **Simple deployment** — Works out of the box on shared hosting and minimal VPS setups.
3. **Adequate performance** — For the current scale (<500 concurrent users), file-based caching is sufficient.
4. **Easy debugging** — Cache files can be inspected directly on disk.
5. **Atomic operations** — Laravel's file store uses file locking for race condition prevention.

---

## Consequences

**Positive:**
- No additional infrastructure cost
- No connection configuration needed
- Portable across all environments

**Negative:**
- Not suitable for horizontal scaling (multiple app servers) — each server has its own cache
- Slower than Redis/Memcached for high-throughput scenarios
- Cache cannot be shared between processes in a clustered environment

---

## Future Migration Path

If the application outgrows file caching, a migration to Redis is straightforward:

```php
// config/cache.php — swap the default driver
'default' => env('CACHE_DRIVER', 'redis'),
```

No application code changes are needed since Laravel's cache API is driver-agnostic.
