# Enrolments Module

Manages academic session enrolments — linking students to units within a specific academic session.

---

## Architecture

```
AcademicSessionEnrolment (pivot model)
   |
   +-- belongsTo: Student
   +-- belongsTo: AcademicSession
   +-- belongsTo: CourseCurriculumUnit
```

- Enrolments associate a student with a specific unit in a specific session.
- Each enrolment represents one student-unit-session combination.
- Batch enrolment creates multiple enrolments at once.

---

## Backend Structure

```
app/Http/Controllers/Api/AcademicSessionEnrolmentController.php
app/Models/AcademicSessionEnrolment.php
app/Http/Requests/AcademicSessionEnrolmentRequest.php
```

### Route Registration

```php
Route::apiResource('academic-session-enrolments', AcademicSessionEnrolmentController::class);
```

**IMPORTANT — Route Ordering**: The `GET /academic-session-enrolments/unit` route must be declared BEFORE `GET /academic-session-enrolments/{academic_session_enrolment}` to prevent the `unit` literal being captured as an ID parameter.

### Key Business Logic

- Duplicate enrolment detection: same student + same session + same unit = 409 conflict.
- Batch enrolment logs failures per item rather than failing the entire batch.
- Enrolments are referenced by attendance, marks, and financial records.

---

## Frontend Structure

```
frontend/src/views/enrolments/
  SessionEnrolmentsPage.jsx
  SessionEnrolmentFormPage.jsx
  BatchEnrolmentPage.jsx
```

### Components

- **SessionEnrolmentsPage**: Lists enrolments with filtering by session, student, unit. Uses `useCallback` for data fetching.
- **SessionEnrolmentFormPage**: Single enrolment creation form.
- **BatchEnrolmentPage**: Multi-select students + multi-select units for bulk enrolment.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/academic-session-enrolments` | List enrolments |
| POST | `/api/academic-session-enrolments` | Create enrolment |
| POST | `/api/academic-session-enrolments/batch` | Batch enrol |
| GET | `/api/academic-session-enrolments/unit` | Enrolments by unit |
| GET | `/api/academic-session-enrolments/{enrolment}` | Get enrolment |
| DELETE | `/api/academic-session-enrolments/{enrolment}` | Delete enrolment |
| GET | `/api/academic-session-enrolments/export` | Export |

---

## Database Table

- `academic_session_enrolments` — id, student_id (FK), academic_session_id (FK), course_curriculum_unit_id (FK), status, enrolled_at, timestamps (unique: student_id + academic_session_id + course_curriculum_unit_id)
