# Students API

Base URL: `/api`

---

## GET /students

List students with pagination, search, and filtering.

### Request

```
GET /api/students?page=1&per_page=20&q=john&sort_by=admission_number&sort_direction=asc
Authorization: Bearer {token}
```

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Results per page |
| `q` | string | — | Search query (matches name, admission number, email) |
| `sort_by` | string | `created_at` | Sort column |
| `sort_direction` | asc\|desc | `desc` | Sort direction |
| `certification_authority_id` | UUID | — | Filter by certification authority |
| `certification_level_id` | UUID | — | Filter by certification level |

### Permissions

Requires `students.view` permission.

### Response (200)

```json
{
  "data": [
    {
      "id": "uuid",
      "admission_number": "ADM-2026-001",
      "first_name": "John",
      "middle_name": "M.",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+254712345678",
      "course_name": "Diploma in IT",
      "certification_level": "Diploma",
      "certification_authority": "KNEC",
      "status": true,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 20,
    "total": 93
  }
}
```

---

## GET /students/meta

Get form metadata: next admission number, course options, etc.

### Request

```
GET /api/students/meta?course_id={courseCurriculumId}
Authorization: Bearer {token}
```

### Permissions

Requires `students.create` permission.

### Response (200)

```json
{
  "next_admission_number": "ADM-2026-094",
  "courses": [
    { "id": "uuid", "name": "Diploma in IT", "code": "DIT" }
  ]
}
```

---

## POST /students

Create a new student.

### Request

```
POST /api/students
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "first_name": "Jane",
  "middle_name": "W.",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+254723456789",
  "course_curriculum_id": "uuid",
  "intake": "2026-01"
}
```

### Validation Rules

| Field | Rules |
|---|---|
| `first_name` | required, string, max:255 |
| `last_name` | required, string, max:255 |
| `email` | required, email, unique:users,email |
| `phone` | required, string |
| `course_curriculum_id` | required, exists:course_curricula,id |

### Permissions

Requires `students.create` permission.

### Response (201)

```json
{
  "id": "uuid",
  "admission_number": "ADM-2026-094",
  "message": "Student created successfully."
}
```

### Response (422)

```json
{
  "message": "Validation failed.",
  "errors": {
    "email": ["The email has already been taken."]
  }
}
```

---

## GET /students/{student}

Get a single student's details.

### Permissions

Requires `students.view` permission.

### Response (200)

```json
{
  "id": "uuid",
  "admission_number": "ADM-2026-001",
  "first_name": "John",
  "middle_name": "M.",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+254712345678",
  "course_curriculum": {
    "id": "uuid",
    "course": { "id": "uuid", "name": "Diploma in IT" },
    "curriculum": { "id": "uuid", "name": "2026 Curriculum" }
  },
  "current_session_enrolment": { ... },
  "status": true
}
```

---

## PUT /students/{student}

Update a student's details.

### Permissions

Requires `students.update` permission.

### Request

Same body as POST with optional fields.

### Response (200)

```json
{
  "id": "uuid",
  "message": "Student updated successfully."
}
```

---

## DELETE /students/{student}

Delete a student (soft delete).

### Permissions

Requires `students.delete` permission.

### Response (204)

No content.

---

## GET /students/export

Export students list.

### Request

```
GET /api/students/export?format=csv&q=john
Authorization: Bearer {token}
```

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `csv` | Export format: `csv`, `xlsx`, `pdf` |
| `q` | string | — | Search filter |

### Rate Limiting

3 requests per minute (configurable via `throttle:3,1`).

### Response

Binary file download with appropriate Content-Type header.

---

## GET /students/{student}/admission-letter

Generate and download a PDF admission letter.

### Request

```
GET /api/students/{student}/admission-letter
Authorization: Bearer {token}
```

### Permissions

Requires `students.view` permission.

### Response

PDF file download (`Content-Type: application/pdf`).
