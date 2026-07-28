# Attendance API

Base URL: `/api`

---

## GET /attendance

List attendance records with pagination and filtering.

**Permissions**: `attendance.view`

**Query Parameters**: `page`, `per_page`, `session_id`, `unit_id`, `student_id`, `date_from`, `date_to`, `status`

---

## POST /attendance/mark

Mark attendance for one or more students.

**Permissions**: `attendance.create`

**Body** (single student):
```json
{
  "unit_id": "uuid",
  "session_id": "uuid",
  "student_id": "uuid",
  "date": "2026-07-28",
  "status": "present",
  "notes": "Arrived on time"
}
```

**Body** (batch):
```json
{
  "unit_id": "uuid",
  "session_id": "uuid",
  "date": "2026-07-28",
  "records": [
    { "student_id": "uuid", "status": "present" },
    { "student_id": "uuid", "status": "absent" },
    { "student_id": "uuid", "status": "late" }
  ]
}
```

**Status Values**: `present`, `absent`, `late`, `excused`

---

## GET /units/{unit}/attendance

Get attendance summary for a specific unit.

**Permissions**: `attendance.view`

**Response**:
```json
{
  "total_sessions": 20,
  "total_students": 30,
  "overall_rate": 85.5,
  "students": [
    {
      "student_id": "uuid",
      "name": "John Doe",
      "present": 18,
      "absent": 1,
      "late": 1,
      "rate": 90.0
    }
  ],
  "daily": [
    { "date": "2026-07-28", "present": 28, "absent": 2, "late": 0 }
  ]
}
```

---

## GET /attendance/export

Export attendance data.

**Permissions**: `attendance.view`

**Rate Limiting**: 3 requests per minute
