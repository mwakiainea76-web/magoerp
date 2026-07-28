# Institution Module

Manages the institution's profile, branding, and current academic session.

---

## Architecture

Single-model module with no child entities. The institution record is a singleton — only one record exists. Used across the system for branding and session context.

---

## Backend Structure

```
app/Http/Controllers/Api/InstitutionController.php
app/Models/Institution.php
```

### Route Registration

```php
Route::get('institution', [InstitutionController::class, 'show']);
Route::put('institution', [InstitutionController::class, 'update']);
Route::put('institution/current-session', [InstitutionController::class, 'setCurrentSession']);
```

### Key Business Logic

- `current_session_id` references an academic session — used to determine the active session across all modules.
- The logo is stored as an image path and served via the storage symlink.

---

## Frontend Structure

```
frontend/src/views/institution/
  InstitutionPage.jsx
  InstitutionFormPage.jsx
```

### Components

- **InstitutionPage**: View institution details with edit button.
- **InstitutionFormPage**: Edit form with fields for name, address, phone, email, website, motto, logo upload.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/institution` | Get institution profile |
| PUT | `/api/institution` | Update institution |
| PUT | `/api/institution/current-session` | Set active session |

---

## Database Table

- `institutions` — id, name, code, address, phone, email, website, logo_url, motto, current_session_id (FK), academic_year_start, academic_year_end, timestamps
