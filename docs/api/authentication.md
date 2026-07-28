# Authentication API

Base URL: `/api`

All endpoints accept and return JSON. Authentication is via Laravel Sanctum Bearer tokens.

---

## POST /login

Authenticate a user and receive an access token.

### Request

```
POST /api/login
Content-Type: application/json
```

```json
{
  "login_id": "john.doe",
  "password": "secret123"
}
```

### Validation Rules

| Field | Rules |
|---|---|
| `login_id` | required, string |
| `password` | required, string, min:6 |

### Response (200)

```json
{
  "token": "1|abc123def456...",
  "user": {
    "id": "uuid",
    "login_id": "john.doe",
    "email": "john@example.com",
    "role": "trainer",
    "must_reset_password": false,
    "permissions": ["students.view", "staff.view"],
    "staff": { "id": "uuid", "first_name": "John", "last_name": "Doe" },
    "student": null
  }
}
```

### Response (422 — Validation Error)

```json
{
  "message": "The login id field is required.",
  "errors": {
    "login_id": ["The login id field is required."]
  }
}
```

### Response (401 — Invalid Credentials)

```json
{
  "message": "Invalid login credentials."
}
```

### Response (429 — Rate Limited)

```json
{
  "message": "Too many login attempts. Please try again in 60 seconds."
}
```

### Rate Limiting

- **Strategy**: Keyed by `login_id|IP` combination
- **Limit**: 5 attempts per 60-second window
- **Response**: HTTP 429 after threshold exceeded

### Notes

- Sets cookie `magoerp_auth_token` containing the token
- Token expiry is null (no automatic expiry)
- The `user.role` is derived from the first assigned Spatie role
- Staff users get `staff` data populated; student users get `student` data
- Super-admin role is excluded from listing but can login

---

## GET /me

Get the authenticated user's profile.

### Request

```
GET /api/me
Authorization: Bearer {token}
```

### Response (200)

```json
{
  "id": "uuid",
  "login_id": "john.doe",
  "email": "john@example.com",
  "role": "trainer",
  "must_reset_password": false,
  "permissions": ["students.view", "staff.view"],
  "staff": { ... },
  "student": null
}
```

### Response (401)

```json
{
  "message": "Unauthenticated."
}
```

---

## POST /change-password

Change the authenticated user's password. Also clears `must_reset_password` flag.

### Request

```
POST /api/change-password
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "current_password": "oldpass123",
  "password": "newpass456",
  "password_confirmation": "newpass456"
}
```

### Validation Rules

| Field | Rules |
|---|---|
| `current_password` | required, string |
| `password` | required, string, min:8, confirmed |
| `password_confirmation` | required (must match `password`) |

### Response (200)

```json
{
  "message": "Password changed successfully."
}
```

### Response (422 — Wrong Current Password)

```json
{
  "message": "Current password is incorrect."
}
```

---

## POST /logout

Log out the authenticated user. Revokes the current access token.

### Request

```
POST /api/logout
Authorization: Bearer {token}
```

### Response (200)

```json
{
  "message": "Logged out successfully."
}
```

### Notes

- Deletes the current Sanctum token
- Forgets the `magoerp_auth_token` cookie
- Other active sessions remain valid

---

## POST /admin/reset-staff-password

Admin-initiated staff password reset. Sets password to `"password"` and enables `must_reset_password`.

### Request

```
POST /api/admin/reset-staff-password
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "login_id": "staff.jane"
}
```

### Permissions

Requires `staff.update` permission.

### Response (200)

```json
{
  "message": "Password has been reset to 'password'. Staff must change it on next login."
}
```

---

## POST /admin/reset-student-password

Admin-initiated student password reset. Sets password to the student's registered phone number and enables `must_reset_password`.

### Request

```
POST /api/admin/reset-student-password
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "login_id": "student.john"
}
```

### Permissions

Requires `students.update` permission.

### Response (200)

```json
{
  "message": "Password has been reset to student's phone number. They must change it on next login."
}
```

---

## Error Reference

| Status | Meaning |
|---|---|
| 401 | Missing or invalid Bearer token |
| 403 | Authenticated but permission denied |
| 423 | Password reset required (`must_reset_password` is true) |
| 429 | Rate limit exceeded (login only) |
