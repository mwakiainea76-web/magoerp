# Operations: Monitoring & Maintenance

---

## Logging

Laravel logs are written to `backend/storage/logs/laravel.log`.

### Log Channels

- `stack` — default, combines single + daily
- `daily` — rotated daily, 30-day retention
- `security` — dedicated channel for security events (separate log file)

### Security Audit Log

Security events (failed logins, blocked requests, suspicious activity) are logged to both:
- `security` log channel
- `security_events` database table (for UI viewing)

---

## Cache

Cache driver is `file`, stored in `backend/storage/framework/cache/data/`.

### Cache Invalidation

```bash
php artisan cache:clear           # Clear all cache
php artisan config:clear          # Clear config cache
php artisan route:clear           # Clear route cache
php artisan view:clear            # Clear compiled views
```

### Key Namespaces

| Prefix | Purpose | TTL |
|---|---|---|
| `risk_score_` | User security risk scores | 10 min |
| `auth_user_` | User authentication data | 60 min |
| `permissions_` | Role permissions | 60 min |
| `settings_` | System configuration | 30 min |

---

## Backup

### Database Backup

```bash
php artisan db:dump --database=mysql > backup/magoerp-$(date +%Y%m%d).sql
```

### Storage Backup

```bash
tar -czf backup/storage-$(date +%Y%m%d).tar.gz backend/storage/app
```

### Automated Backups

Configure a cron job:

```cron
0 2 * * * cd /var/www/magoerp && php artisan db:dump > backups/daily/$(date +\%Y\%m\%d).sql
0 3 * * 0 find backups/daily -mtime +30 -delete
```

---

## Scheduled Tasks

Configure Laravel scheduler in crontab:

```cron
* * * * * cd /var/www/magoerp/backend && php artisan schedule:run >> /dev/null 2>&1
```

### Current Scheduled Tasks

| Task | Frequency | Description |
|---|---|---|
| `security:cleanup-events` | daily | Purge security events older than 90 days |
| `finance:generate-invoices` | monthly | Auto-generate invoices for active students |
| `cache:clean-expired` | hourly | Remove expired cache entries |

---

## Performance Monitoring

### Key Metrics

- API response time (target: <500ms p95)
- Database query count per request (target: <20)
- Memory usage per request (target: <64MB)
- Cache hit ratio (target: >80%)

### Slow Query Logging

Enable in MySQL for queries > 1 second:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
```

---

## Security Monitoring

Review daily:
1. Failed login attempts (check `/security/events` with `event_type=LoginFailed`)
2. Blocked IPs, devices, users
3. Rate limit hits
4. Suspicious activity events (severity=critical)

### Alert Thresholds

| Metric | Threshold | Action |
|---|---|---|
| Failed logins per user | >5 in 15 min | Auto-lock account |
| Requests from single IP | >100/min | Auto-block IP |
| Concurrent sessions | >5 per user | Invalidate old sessions |
| Risk score | >50 | Flag for admin review |
