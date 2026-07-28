# Staff API

Base URL: `/api`

All endpoints require `auth:sanctum`. Staff management handles user accounts with staff roles.

---

## GET /staff

List staff members with pagination, search, and filtering.

**Permissions**: `staff.view`

**Query Parameters**: `page`, `per_page`, `q`, `role`, `status`, `sort_by`, `sort_direction`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "login_id": "john.doe",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+254712345678",
      "role": "admin",
      "is_active": true,
      "last_login_at": "2026-07-28T10:00:00Z"
    }
  ],
  "meta": { "current_page": 1, "last_page": 3, "per_page": 20, "total": 45 }
}
```

---

## GET /staff/meta

Get form metadata for staff creation.

**Permissions**: `staff.create`

**Response (200)**:
```json
{
  "roles": ["admin", "lecturer", "finance", "security", "registrar"]
}
```

---

## POST /staff

Create a new staff member (also creates a `User` record).

**Permissions**: `staff.create`

**Body**:
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+254723456789",
  "role": "lecturer",
  "password": "securePassword123"
}
```

**Validation Rules**:
- `email`: required, unique:users,email
- `role`: required, in: [admin, lecturer, finance, security, registrar]

**Response (201)**: Staff created.

---

## GET /staff/{staff}

Get a single staff member's details.

**Permissions**: `staff.view`

---

## PUT /staff/{staff}

Update a staff member's details.

**Permissions**: `staff.update`

---

## DELETE /staff/{staff}

Soft-delete a staff member (sets `deleted_at`; user account retained).

**Permissions**: `staff.delete`

**Response (204)**

---

## GET /staff/export

Export staff list.

**Permissions**: `staff.view`

**Query Parameters**: `format` (csv, xlsx, pdf), `q`

**Rate Limiting**: 3 requests per minute
