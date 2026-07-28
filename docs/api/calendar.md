# Calendar API

Base URL: `/api`

---

## GET /calendar/events

List calendar events within a date range.

**Permissions**: `calendar.view`

**Query Parameters**: `start_date`, `end_date`, `type`, `scope`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "End of Semester Exams",
      "description": "Final examinations for Semester 1",
      "start_date": "2026-05-10",
      "end_date": "2026-05-20",
      "type": "exam",
      "scope": "institution",
      "created_by": { "id": "uuid", "name": "Admin User" }
    }
  ]
}
```

**Type Values**: `academic`, `exam`, `holiday`, `event`, `meeting`
**Scope Values**: `institution`, `department`, `course`

---

## POST /calendar/events

Create a calendar event.

**Permissions**: `calendar.create`

**Body**:
```json
{
  "title": "Graduation Ceremony",
  "description": "Annual graduation ceremony",
  "start_date": "2026-08-15T09:00:00Z",
  "end_date": "2026-08-15T17:00:00Z",
  "type": "event",
  "scope": "institution",
  "is_all_day": false
}
```

---

## PUT /calendar/events/{event}
## DELETE /calendar/events/{event}
