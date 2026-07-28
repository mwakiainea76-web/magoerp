# Timetables API

Base URL: `/api`

---

## GET /timetables

List timetables with pagination and filtering.

**Permissions**: `timetable.view`

**Query Parameters**: `page`, `per_page`, `session_id`, `unit_id`, `lecturer_id`, `room_id`, `day_of_week`

---

## POST /timetables

Create a timetable entry.

**Permissions**: `timetable.create`

**Body**:
```json
{
  "academic_session_id": "uuid",
  "unit_id": "uuid",
  "lecturer_id": "uuid",
  "room_id": "uuid",
  "day_of_week": "monday",
  "start_time": "08:00",
  "end_time": "10:00",
  "type": "lecture"
}
```

**Type Values**: `lecture`, `practical`, `tutorial`, `exam`

---

## GET /timetables/{timetable}
## PUT /timetables/{timetable}
## DELETE /timetables/{timetable}

Standard CRUD operations.

**Permissions**: `timetable.view`, `timetable.update`, `timetable.delete`

---

## GET /timetables/check-conflict

Check if a proposed timetable slot has conflicts.

**Query Parameters**: `room_id`, `day_of_week`, `start_time`, `end_time`, `exclude_id`

**Response (200)**:
```json
{
  "has_conflict": false,
  "conflicts": []
}
```

---

## GET /timetables/export

Export timetables.

**Rate Limiting**: 3 requests per minute

---

## GET /timetables/lecturer/{lecturer}

Get timetable for a specific lecturer.

## GET /timetables/room/{room}

Get timetable for a specific room.

## GET /timetables/student/{student}

Get timetable for a specific student (based on enrolled units).
