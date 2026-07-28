# Hostel API

Base URL: `/api`

---

## Rooms

### GET /hostel-rooms

List hostel rooms with pagination.

**Permissions**: `hostel.view`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "room_number": "A101",
      "block": "A",
      "floor": 1,
      "capacity": 4,
      "occupied": 3,
      "status": "available",
      "gender": "male"
    }
  ],
  "meta": { ... }
}
```

### POST /hostel-rooms

Create a hostel room.

**Permissions**: `hostel.create`

**Body**:
```json
{
  "room_number": "A102",
  "block": "A",
  "floor": 1,
  "capacity": 2,
  "gender": "female"
}
```

### PUT /hostel-rooms/{room}
### DELETE /hostel-rooms/{room}

---

## Allocations

### GET /hostel-allocations

List hostel allocations.

**Permissions**: `hostel.view`

### POST /hostel-allocations

Allocate a student to a room.

**Permissions**: `hostel.create`

**Body**:
```json
{
  "student_id": "uuid",
  "hostel_room_id": "uuid",
  "start_date": "2026-01-15",
  "end_date": "2026-12-15"
}
```

### PUT /hostel-allocations/{allocation}
### DELETE /hostel-allocations/{allocation}

Deallocate a student (sets `end_date` to now).

---

## My Hostel (Student)

### GET /my-hostel

Get the authenticated student's current hostel allocation.

**Auth**: Student role

**Response (200)**:
```json
{
  "allocation": {
    "id": "uuid",
    "room": { "room_number": "A101", "block": "A", "floor": 1 },
    "start_date": "2026-01-15",
    "end_date": null,
    "roommates": [...]
  }
}
```

Returns `null` if not allocated.
