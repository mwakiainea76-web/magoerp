# Enrolments API

Base URL: `/api`

---

## GET /academic-session-enrolments

List session enrolments with pagination and filtering.

**Permissions**: `enrolments.view`

**Query Parameters**: `page`, `per_page`, `session_id`, `student_id`, `q`, `status`, `sort_by`, `sort_direction`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "student": { "id": "uuid", "name": "John Doe", "admission_number": "ADM-2026-001" },
      "session": { "id": "uuid", "name": "2026 Semester 1" },
      "unit": { "id": "uuid", "name": "Introduction to Programming", "code": "ICT101" },
      "status": "active",
      "enrolled_at": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": { ... }
}
```

---

## POST /academic-session-enrolments

Enrol a student in a session unit.

**Permissions**: `enrolments.create`

**Body**:
```json
{
  "student_id": "uuid",
  "academic_session_id": "uuid",
  "course_curriculum_unit_id": "uuid"
}
```

**Validation Rules**:
- Student must not already be enrolled in the same unit for the same session
- Student must belong to the course curriculum that owns the unit

**Response (201)**: Enrolment created.

---

## POST /academic-session-enrolments/batch

Batch enrol multiple students.

**Permissions**: `enrolments.create`

**Body**:
```json
{
  "academic_session_id": "uuid",
  "student_ids": ["uuid1", "uuid2"],
  "course_curriculum_unit_ids": ["uuidA", "uuidB"]
}
```

Creates all valid combinations; skips duplicates.

---

## GET /academic-session-enrolments/unit

Get enrolments for a specific unit (must be declared before `GET /academic-session-enrolments/{enrolment}` in routes).

**Query Parameters**: `unit_id`, `session_id`

**Permissions**: `enrolments.view`

---

## GET /academic-session-enrolments/{enrolment}
## DELETE /academic-session-enrolments/{enrolment}

---

## GET /academic-session-enrolments/export

Export enrolments.

**Rate Limiting**: 3 requests per minute
