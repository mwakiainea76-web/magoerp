# Access Control Module

Role-based access control (RBAC) system managing users, roles, and permissions.

---

## Architecture

```
User (model) ── M:N ──> Role (model) ── M:N ──> Permission (model)
```

A user can have multiple roles; each role has multiple permissions. Permissions are checked via middleware (`can:permission.name`) in route definitions.

---

## Backend Structure

```
app/Http/Controllers/Api/AccessControlController.php
app/Models/User.php (role/permission relationships)
app/Http/Requests/AccessControl/PermissionRequest.php
```

### Route Registration

```php
Route::prefix('access-control')->group(function () {
    Route::apiResource('roles', AccessControl\RoleController::class);
    Route::get('permissions', [AccessControl\PermissionController::class, 'index']);
    Route::post('roles/{role}/permissions', [AccessControl\PermissionController::class, 'assign']);
    Route::delete('roles/{role}/permissions', [AccessControl\PermissionController::class, 'remove']);
});
```

### Key Business Logic

- Permissions follow the `{module}.{action}` convention (e.g., `students.view`, `finance.create`).
- Middleware `can:permission` at the controller or route level enforces authorization.
- Roles can be assigned/unassigned from users dynamically.

---

## Frontend Structure

```
frontend/src/views/access-control/
  AccessControlRolesPage.jsx
  AccessControlRoleFormPage.jsx
  AccessControlPermissionsPage.jsx
  AccessControlUserRolesPage.jsx
```

### Components

- **AccessControlRolesPage**: Lists roles with user and permission counts.
- **AccessControlRoleFormPage**: Create/edit role with permission checkboxes grouped by module.
- **AccessControlPermissionsPage**: Read-only view of all permissions grouped by module.
- **AccessControlUserRolesPage**: Manage role assignments for individual users.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/access-control/roles` | List roles |
| POST | `/api/access-control/roles` | Create role |
| GET | `/api/access-control/roles/{role}` | Get role with permissions |
| PUT | `/api/access-control/roles/{role}` | Update role |
| DELETE | `/api/access-control/roles/{role}` | Delete role |
| GET | `/api/access-control/permissions` | List all permissions |
| POST | `/api/access-control/roles/{role}/permissions` | Assign permissions |
| DELETE | `/api/access-control/roles/{role}/permissions` | Remove permissions |
| GET/POST/DELETE | `/api/access-control/users/{user}/roles` | Manage user roles |

---

## Database Tables

- `roles` — id, name, display_name, description, guard_name
- `permissions` — id, name, display_name, description, guard_name, module
- `role_has_permissions` — role_id (FK), permission_id (FK)
- `user_has_roles` — user_id (FK), role_id (FK)
