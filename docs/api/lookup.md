# Lookup API

Base URL: `/api`

Read-only endpoints for populating dropdowns and selectors across the frontend. No authentication required for non-sensitive lookups; sensitive lookups require `auth:sanctum`.

---

## GET /lookup/courses

```json
[
  { "id": "uuid", "name": "Diploma in Information Technology", "code": "DIT" },
  { "id": "uuid", "name": "Certificate in Business Management", "code": "CBM" }
]
```

## GET /lookup/course-curricula

```json
[
  { "id": "uuid", "name": "2026 Curriculum - DIT", "course": "DIT" }
]
```

## GET /lookup/units

```json
[
  { "id": "uuid", "name": "Introduction to Programming", "code": "ICT101" }
]
```

## GET /lookup/curricula

```json
[
  { "id": "uuid", "name": "2026 Curriculum", "course": "DIT", "start_year": 2026 }
]
```

## GET /lookup/academic-sessions

```json
[
  { "id": "uuid", "name": "2026 Semester 1", "start_date": "2026-01-15", "end_date": "2026-05-15" }
]
```

## GET /lookup/lecturers

**Auth**: Required

```json
[
  { "id": "uuid", "name": "Dr. John Doe", "staff_id": "STF-001" }
]
```

## GET /lookup/rooms

**Auth**: Required

```json
[
  { "id": "uuid", "name": "Lab 101", "capacity": 30, "type": "lab" }
]
```

## GET /lookup/students

**Auth**: Required

```
GET /api/lookup/students?q=john
```

```json
[
  { "id": "uuid", "name": "John Doe", "admission_number": "ADM-2026-001" }
]
```

---

## GET /lookup/certification-authorities

```json
[
  { "id": "uuid", "name": "KNEC", "code": "KNEC" }
]
```

## GET /lookup/certification-levels

```
GET /api/lookup/certification-levels?certification_authority_id=uuid
```

```json
[
  { "id": "uuid", "name": "Diploma", "code": "DIP" }
]
```
