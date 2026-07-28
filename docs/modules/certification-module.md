# Certification Module

Manages certification authorities (exam bodies) and their certification levels, used to classify courses and curricula.

---

## Architecture

```
CertificationAuthority (model)     CertificationLevel (model)
   |                                     |
   +-- hasMany: CertificationLevel ------+
   +-- hasManyThrough: Courses
```

- **CertificationAuthority**: An examination or certification body (e.g., KNEC, KASNEB, CDACC).
- **CertificationLevel**: A level within an authority (e.g., Diploma, Certificate, Degree).
- Courses reference a certification level, which in turn belongs to an authority.

---

## Backend Structure

```
app/Http/Controllers/Api/CertificationAuthorityController.php
app/Http/Controllers/Api/CertificationLevelController.php
app/Models/CertificationAuthority.php
app/Models/CertificationLevel.php
app/Http/Requests/CertificationAuthorityRequest.php
app/Http/Requests/CertificationLevelRequest.php
```

### Route Registration

```php
Route::apiResource('certification-authorities', CertificationAuthorityController::class);
Route::apiResource('certification-levels', CertificationLevelController::class);
```

### Key Business Logic

- `getApiErrorMessage()` is used for consistent error handling in both controllers (critical import verified).
- Certification levels are ordered by `sort_order` for display purposes.
- Deleting an authority requires no active certification levels to be linked to courses.

---

## Frontend Structure

```
frontend/src/views/certification/
  CertificationAuthorityPage.jsx
  CertificationAuthorityFormPage.jsx
  CertificationLevelPage.jsx
  CertificationLevelFormPage.jsx
```

### Components

- **CertificationAuthorityPage**: Lists all certification authorities. Uses modal for create/edit.
- **CertificationAuthorityFormPage**: Form for creating/editing authorities.
- **CertificationLevelPage**: Lists levels with filtering by authority. Modal for create/edit.
- **CertificationLevelFormPage**: Form for creating/editing levels.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/certification-authorities` | List authorities |
| POST | `/api/certification-authorities` | Create authority |
| GET/PUT/DELETE | `/api/certification-authorities/{authority}` | CRUD |
| GET | `/api/certification-levels` | List levels |
| POST | `/api/certification-levels` | Create level |
| GET/PUT/DELETE | `/api/certification-levels/{level}` | CRUD |

---

## Database Tables

- `certification_authorities` — id, name, code, description, is_active
- `certification_levels` — id, certification_authority_id (FK), name, code, sort_order, is_active
