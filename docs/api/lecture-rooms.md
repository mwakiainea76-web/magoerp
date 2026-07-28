# Lecture Rooms API

Base URL: `/api`

---

## GET /lecture-rooms

List lecture rooms.

**Permissions**: `timetable.view`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Lab 101",
      "code": "LAB101",
      "capacity": 30,
      "type": "lab",
      "building": "Main Building",
      "floor": 1,
      "facilities": ["projector", "computers", "whiteboard"],
      "is_active": true
    }
  ],
  "meta": { ... }
}
```

**Type Values**: `classroom`, `lab`, `lecture_hall`, `seminar_room`

---

## POST /lecture-rooms

Create a lecture room.

**Permissions**: `timetable.create`

**Body**:
```json
{
  "name": "Lab 101",
  "code": "LAB101",
  "capacity": 30,
  "type": "lab",
  "building": "Main Building",
  "floor": 1,
  "facilities": ["projector", "computers"]
}
```

---

## PUT /lecture-rooms/{room}
## DELETE /lecture-rooms/{room}

---

## GET /lecture-rooms/export

Export lecture rooms.

**Rate Limiting**: 3 requests per minute
