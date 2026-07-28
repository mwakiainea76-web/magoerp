# Accommodation Module

Manages hostel rooms and student allocations within the institution.

---

## Architecture

```
HostelRoom (model)     HostelAllocation (model)
   |                          |
   +-- belongsTo: ---<--------+
   +-- hasMany: HostelAllocation
```

- **HostelRoom**: Represents a physical room with room number, block, floor, capacity, gender restriction, and status (available/occupied/maintenance).
- **HostelAllocation**: Links a student to a room for a date range. Allocation and deallocation are tracked.

---

## Backend Structure

```
app/Http/Controllers/Api/HostelRoomController.php
app/Http/Controllers/Api/HostelAllocationController.php
app/Http/Controllers/Api/MyHostelController.php
app/Models/HostelRoom.php
app/Models/HostelAllocation.php
app/Http/Requests/HostelRoomRequest.php
```

### Route Registration

```php
Route::apiResource('hostel-rooms', HostelRoomController::class);
Route::apiResource('hostel-allocations', HostelAllocationController::class);
Route::get('my-hostel', [MyHostelController::class, 'index']);
```

### Key Business Logic

- Allocations check room capacity before assigning
- `occupancy` is derived from active allocations (those with null `end_date` or future `end_date`)
- Students can only be allocated to gender-matched rooms
- Deallocation sets `end_date` to current timestamp (soft deallocation)

---

## Frontend Structure

```
frontend/src/views/hostel/
  HostelRoomsPage.jsx
  HostelRoomFormPage.jsx
  HostelAllocationsPage.jsx
  HostelAllocationFormPage.jsx
  MyHostelPage.jsx
```

### Components

- **HostelRoomsPage**: Lists all rooms with occupancy indicator, status badges. Modal auto-closes on successful room creation/update.
- **HostelRoomFormPage**: Create/edit room form with capacity, gender, block, floor fields.
- **HostelAllocationsPage**: Lists allocations with per-page pagination. Uses `useCallback` for data fetching.
- **MyHostelPage**: Student-facing view showing current allocation, roommates, and room details.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hostel-rooms` | List rooms |
| POST | `/api/hostel-rooms` | Create room |
| GET | `/api/hostel-rooms/{room}` | Get room |
| PUT | `/api/hostel-rooms/{room}` | Update room |
| DELETE | `/api/hostel-rooms/{room}` | Delete room |
| GET | `/api/hostel-allocations` | List allocations |
| POST | `/api/hostel-allocations` | Create allocation |
| GET | `/api/hostel-allocations/{allocation}` | Get allocation |
| PUT | `/api/hostel-allocations/{allocation}` | Update allocation |
| DELETE | `/api/hostel-allocations/{allocation}` | Deallocate |
| GET | `/api/my-hostel` | Student's own allocation |

---

## Database Tables

- `hostel_rooms` — id, room_number, block, floor, capacity, gender, status, timestamps
- `hostel_allocations` — id, student_id (FK), hostel_room_id (FK), start_date, end_date, timestamps
