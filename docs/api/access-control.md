# Access Control API

Base URL: `/api`

---

## Roles

### GET /access-control/roles

List all roles with their permissions.

**Permissions**: `access-control.view`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "admin",
      "display_name": "Administrator",
      "description": "Full system access",
      "permissions_count": 45,
      "users_count": 3
    }
  ]
}
```

### POST /access-control/roles

Create a role.

**Permissions**: `access-control.create`

**Body**:
```json
{
  "name": "exam_officer",
  "display_name": "Exam Officer",
  "description": "Manages examinations and results"
}
```

### PUT /access-control/roles/{role}
### DELETE /access-control/roles/{role}

---

## Permissions

### GET /access-control/permissions

List all permissions grouped by module.

**Permissions**: `access-control.view`

**Response (200)**:
```json
{
  "data": {
    "Academic": ["courses.view", "courses.create", "courses.update", "courses.delete"],
    "Finance": ["finance.view", "finance.create"],
    "Security": ["security.view", "security.manage"]
  }
}
```

### POST /access-control/roles/{role}/permissions

Assign permissions to a role.

**Permissions**: `access-control.update`

**Body**:
```json
{
  "permissions": ["courses.view", "courses.create", "finance.view"]
}
```

### DELETE /access-control/roles/{role}/permissions

Remove permissions from a role.

**Body**:
```json
{
  "permissions": ["courses.delete"]
}
```

---

## User Roles

### GET /access-control/users/{user}/roles

Get roles assigned to a user.

### POST /access-control/users/{user}/roles

Assign roles to a user.

**Body**:
```json
{
  "roles": ["lecturer", "exam_officer"]
}
```

### DELETE /access-control/users/{user}/roles

Remove roles from a user.
