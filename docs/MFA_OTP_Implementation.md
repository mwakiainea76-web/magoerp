# MFA via Email OTP — Implementation Summary

## Overview
Two-factor authentication using a one-time password (OTP) sent via email. Admin users always require MFA on login; other roles (e.g., finance) can be enabled via system configuration.

---

## Architecture

```
Login POST /api/login
  │
  ├─ User has admin role? → Always require OTP
  ├─ User has role in mfa_required_roles config? → Require OTP
  │
  ├─ YES → generate 6-digit OTP → hash + store in otps table
  │        → send email via LoginOtpMail (Resend / log)
  │        → return { requires_otp: true, temporary_token: "uuid" }
  │
  └─ NO  → return { token, user } (normal login)
```

```
Verify OTP POST /api/login/verify-otp
  │
  ├─ temporary_token exists + not used + not expired → validate OTP hash
  │
  ├─ Valid → mark OTP used, create Sanctum token, return { token, user }
  │
  └─ Invalid → 422 with error message
```

---

## Files Created / Modified

### Backend — New Files
| File | Purpose |
|---|---|
| `database/migrations/2026_07_28_100009_create_otps_table.php` | `otps` table (id, user_id, otp[hashed], temporary_token, type, expires_at, used_at) |
| `app/Models/Otp.php` | Otp model with BelongsTo user, guarded, casts |
| `app/Mail/LoginOtpMail.php` | ShouldQueue mailable, renders login-otp blade |
| `resources/views/emails/login-otp.blade.php` | Email template with 6-digit code |
| `app/Http/Requests/Auth/VerifyOtpRequest.php` | Validates temporary_token (exists:otps) + otp (size:6) |

### Backend — Modified Files
| File | Change |
|---|---|
| `app/Http/Controllers/Api/AuthController.php` | `login()` checks MFA roles + always includes admin; new `verifyOtp()`, `generateAndSendOtp()`, `otpThrottleKey()`, `ensureOtpNotRateLimited()` |
| `bootstrap/providers.php` | **Critical fix**: `ResendServiceProvider` moved here (NOT in `config/app.php['providers']`) |
| `app/Models/SystemConfiguration.php` | `getValue()` handles `multi_select` type (explodes comma string to array) |
| `app/Http/Controllers/Api/SystemConfigurationsController.php` | `index()` formats multi_select as array; `update()` validates comma-separated string + exists:roles |
| `database/seeders/SystemConfigurationSeeder.php` | Seeds `mfa_required_roles` with type `multi_select` (default: `"finance"`) |
| `routes/api.php` | Added `POST /api/login/verify-otp` |

### Frontend — New Files
| File | Purpose |
|---|---|
| `src/pages/auth/VerifyOtpPage.jsx` | 6-digit OTP input, calls `/login/verify-otp`, sets auth on success |

### Frontend — Modified Files
| File | Change |
|---|---|
| `src/pages/auth/LoginPage.jsx` | Checks `payload.requires_otp` → navigates to `/verify-otp` with `temporary_token` |
| `src/hooks/useAuthApi.js` | Added `verifyOtp({ temporaryToken, otp })` |
| `src/App.jsx` | Added lazy-loaded `/verify-otp` route under `AuthLayout` |
| `src/pages/admin/SystemConfigurationsPage.jsx` | Multi-select checkbox chips; admin always checked + disabled with `(always)` label; auto-scroll on hash |
| `src/support/navigation/permissioned.nav.js` | Added "MFA Roles" link under System |
| `src/hooks/useSystemConfigurationsApi.js` | (verified/correct) |

---

## Email Configuration (Resend)

### Provider
[Resend](https://resend.com) is the email provider. Package: `resend/resend-laravel`.

### Environment Variables (`.env`)
```
MAIL_MAILER=resend               # resend | log (dev)
RESEND_API_KEY=re_xxxxxxxxxxxx   # your Resend API key
MAIL_FROM_ADDRESS="noreply@yourdomain.com"   # must be a domain verified on Resend
MAIL_FROM_NAME="${APP_NAME}"
```

### Service Provider Registration — Critical
**DO NOT** add `ResendServiceProvider` to `config/app.php['providers']`.

The `providers` array in `config/app.php` **replaces** Laravel's built-in provider list entirely — it does not append. If you put only `ResendServiceProvider::class` there, you lose all 23 default providers (including `FilesystemServiceProvider`, `HashServiceProvider`, etc.), causing errors like `"Target class [files] does not exist"`.

**Correct location**: `bootstrap/providers.php`
```php
return [
    App\Providers\AppServiceProvider::class,
    // ... other app providers ...
    ResendServiceProvider::class,
];
```

### Dev vs Production
| Env | `MAIL_MAILER` | `MAIL_FROM_ADDRESS` | Behavior |
|---|---|---|---|
| Development | `log` | any | OTP written to `storage/logs/laravel.log` — no actual email sent |
| Production | `resend` | verified domain | OTP sent via Resend API — domain must be verified at https://resend.com/domains |

To verify a domain on Resend:
1. Go to https://resend.com/domains → Add Domain
2. Add the provided DNS records (TXT, CNAME, MX) to your domain's DNS
3. Wait for verification (can take a few minutes)
4. Set `MAIL_FROM_ADDRESS` to an address using that domain

Resend delivers from any environment (localhost, staging, prod) as long as the sender domain is verified.

---

## Key Design Decisions

### 1. Admin always requires MFA
Hardcoded in `AuthController::login()`:
```php
$mfaRoles = SystemConfiguration::getValue('mfa_required_roles', []);
$mfaRoles[] = 'admin';
```
Admin checkbox on the UI is always checked + disabled and labeled "Admin (always)".

### 2. multi_select stored as comma-separated string
The DB stores `"admin,finance"`. The model's `getValue()` returns `["admin", "finance"]` for API responses. The frontend sends a comma-separated string on save.

### 3. ResendServiceProvider must be in bootstrap/providers.php
If placed in `config/app.php['providers']`, it **replaces all 23 default Laravel service providers** (including `FilesystemServiceProvider`), breaking the `files` container binding.

### 4. Rate limiting
- Login attempts: 5 per 60 seconds per IP
- OTP verification: 5 per 1 minute per temporary_token (configurable in `config/security.php`)

### 5. OTP lifecycle
- Generated on login, hashed with `Hash::make()`, stored in `otps` table
- Expires after 10 minutes (`expires_at`)
- Unused OTPs for the same user are deleted before generating new ones
- Single-use: `used_at` prevents reuse

### 6. Dev vs Production email
| Env | `MAIL_MAILER` | Behavior |
|---|---|---|
| Dev | `log` | OTP written to `storage/logs/laravel.log` |
| Production | `resend` | OTP sent via Resend (requires verified domain in Resend dashboard) |

---

## Testing the OTP Flow (Dev)

1. Login as admin → redirected to `/verify-otp`
2. Fetch OTP from log:
   ```powershell
   Select-String "login-otp" .\storage\logs\laravel.log | Select-Object -Last 5
   ```
3. Enter 6-digit code → authenticated and redirected to dashboard
4. OTP expires after 10 minutes; expired / wrong codes return 422

---

## Configuration

**System Configurations page** → search for `mfa_required_roles` or navigate via System → MFA Roles sidebar link.

Roles listed are fetched from `/api/lookups/roles`. Admin is always enforced and shown as disabled.

**Seeder default**: `"finance"` (only finance optionally requires MFA; admin is automatic).

---

## Optimizations

### 1. Resend OTP Endpoint
`POST /api/login/resend-otp` — allows users to request a new code without re-entering credentials.

- **Input**: `{ temporary_token }` (the current expired/wrong token)
- **Process**: validates the token is valid + unexpired → deletes the old OTP → generates a new one → sends email → returns `{ temporary_token, expires_at }`
- **Frontend**: "Resend Code" link on `/verify-otp` updates the URL state with the new token

### 2. Expiry Countdown Timer (Frontend)
`VerifyOtpPage` shows a live `M:SS` countdown next to the heading ("Code expires in 9:32"). When it hits 0, the verify button is disabled and the user sees "Expired".

The countdown is driven by `expires_at` passed from the backend login/resend response.

### 3. Auto-Focus OTP Input
On mount, the OTP input receives focus so the user can start typing immediately without clicking.

### 4. Input Auto-Clear on Error
When OTP verification fails, the input is cleared and refocused — no manual backspacing needed.

### 5. Used-token Validation at Request Level
`VerifyOtpRequest` now uses `Rule::exists('otps', 'temporary_token')->whereNull('used_at')` — the validation layer rejects already-consumed tokens before the controller even runs.

### 6. Database Indexes
Added composite index `[user_id, type, expires_at]` on the `otps` table for efficient lookups when:
- Finding unused unexpired OTPs for a user (login resend cleanup)
- Querying by user + type (future use cases)

### 7. OTP Cleanup Command
```
php artisan otp:cleanup
```
Deletes expired and used OTP records older than 24 hours (configurable via `--hours`).

**Scheduled run** — add to `routes/console.php`:
```php
Schedule::command('otp:cleanup')->daily();
```

### New / Modified Files (Optimizations)

| File | Type | Purpose |
|---|---|---|
| `database/migrations/2026_07_28_100010_add_otps_indexes.php` | New | Composite index on `[user_id, type, expires_at]` |
| `app/Http/Requests/Auth/ResendOtpRequest.php` | New | Validates `temporary_token` exists + not used |
| `app/Http/Requests/Auth/VerifyOtpRequest.php` | Modified | Added `whereNull('used_at')` to token validation |
| `app/Http/Controllers/Api/AuthController.php` | Modified | Added `resendOtp()`; `login()` now returns `expires_at` |
| `app/Console/Commands/CleanupOtps.php` | New | `php artisan otp:cleanup` command |
| `routes/api.php` | Modified | Added `POST /login/resend-otp` |
| `frontend/src/hooks/useAuthApi.js` | Modified | Added `resendOtp({ temporaryToken })` |
| `frontend/src/pages/auth/VerifyOtpPage.jsx` | Modified | Auto-focus, live countdown, resend link, auto-clear on error |
| `frontend/src/pages/auth/LoginPage.jsx` | Modified | Passes `expires_at` to verify-otp page |
