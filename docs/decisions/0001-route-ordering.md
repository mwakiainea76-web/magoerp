# ADR 0001: Route Ordering Convention

**Status**: Accepted  
**Date**: 2026-07-28  
**Author**: System Audit

---

## Context

Laravel's API resource routes capture path segments as route parameters. When a static route path (e.g., `/api/support-requests/staff-list`) is declared after a parameterized route (e.g., `/api/support-requests/{support_request}`), the literal string `staff-list` is matched by `{support_request}` and passed to the controller as a model ID, resulting in a 404 (ModelNotFoundException).

This was observed in three separate route files during the codebase audit:

1. `api.php` — `support-requests/staff-list` vs `support-requests/{support_request}`
2. `api.php` — `academic-session-enrolments/unit` vs `academic-session-enrolments/{academic_session_enrolment}`
3. `security.php` — `security/sessions/close-all/{user}` vs `security/sessions/{session}`

---

## Decision

Always place static routes before parameterized routes within the same route group or prefix.

### Correct Ordering

```php
// Static routes first
Route::get('support-requests/staff-list', ...);
Route::get('academic-session-enrolments/unit', ...);
Route::post('security/sessions/close-all/{user}', ...);

// Parameterized routes after
Route::get('support-requests/{support_request}', ...);
Route::get('academic-session-enrolments/{enrolment}', ...);
Route::get('security/sessions/{session}', ...);
```

### When Using `apiResource`

When mixing `apiResource` with custom static routes, declare the static routes before the `apiResource` call:

```php
// Static custom route first
Route::get('support-requests/staff-list', ...);

// Then resource routes
Route::apiResource('support-requests', SupportRequestController::class);
```

---

## Consequences

**Positive:**
- Prevents 404 errors on static routes
- Consistent, predictable routing
- Easy to spot during code review

**Negative:**
- Requires conscious ordering; easy to forget when adding new routes
- Tooling (linter) may be needed to enforce this convention

---

## Alternatives Considered

1. **Explicit route names** — Using `->name()` does not solve the problem since matching happens before name resolution.
2. **Route patterns** — Using `->where('support_request', '[0-9a-f-]+')` constraints on the parameter, but UUID pattern doesn't prevent string matching.
3. **Prefix separation** — Using a different prefix for static routes (e.g., `/api/support/staff-list`), but this changes the API contract.
