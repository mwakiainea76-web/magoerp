# Support Requests API

Base URL: `/api`

---

## GET /support-requests

List support requests with pagination and filtering.

**Permissions**: `support.view`

**Query Parameters**: `page`, `per_page`, `status`, `priority`, `category`, `assigned_to`, `q`

---

## POST /support-requests

Create a new support request.

**Permissions**: `support.create`

**Body**:
```json
{
  "subject": "Cannot access hostel portal",
  "category": "technical",
  "priority": "medium",
  "description": "I keep getting a 500 error when trying to view my hostel allocation."
}
```

**Category Values**: `technical`, `academic`, `financial`, `hostel`, `other`
**Priority Values**: `low`, `medium`, `high`, `urgent`

---

## GET /support-requests/staff-list

List all support requests visible to staff (must be declared before `GET /support-requests/{support_request}` in routes).

**Permissions**: `support.view`

---

## GET /support-requests/{support_request}
## PUT /support-requests/{support_request}
## DELETE /support-requests/{support_request}

Standard CRUD.

---

## PUT /support-requests/{support_request}/status

Update the status of a support request.

**Permissions**: `support.update`

**Body**:
```json
{
  "status": "in_progress"
}
```

**Status Values**: `open`, `in_progress`, `resolved`, `closed`

---

## POST /support-requests/{support_request}/assign

Assign a support request to a staff member.

**Permissions**: `support.update`

**Body**:
```json
{
  "assigned_to": "user-uuid"
}
```

---

## POST /support-requests/{support_request}/comments

Add a comment to a support request.

**Permissions**: `support.update`

**Body**:
```json
{
  "content": "I have checked the issue. The hostel module API is currently down for maintenance."
}
```

---

## GET /my-support-requests

Get the authenticated user's own support requests.

**Auth**: Any authenticated user

---

## GET /support-requests/export

Export support requests.

**Rate Limiting**: 3 requests per minute
