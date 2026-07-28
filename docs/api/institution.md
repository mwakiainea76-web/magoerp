# Institution API

Base URL: `/api`

---

## GET /institution

Get the institution's profile/settings.

**Permissions**: `institution.view`

**Response (200)**:
```json
{
  "id": "uuid",
  "name": "Mago ERP Institute of Technology",
  "code": "MAGO",
  "address": "123 Main Street, Nairobi",
  "phone": "+254700100200",
  "email": "info@magoerp.com",
  "website": "https://magoerp.com",
  "logo_url": "https://magoerp.com/storage/logo.png",
  "motto": "Empowering Education Through Technology",
  "current_session_id": "uuid",
  "current_session": { ... },
  "academic_year_start": "2026-01-01",
  "academic_year_end": "2026-12-31"
}
```

---

## PUT /institution

Update institution profile.

**Permissions**: `institution.update`

**Body**:
```json
{
  "name": "Mago ERP Institute of Technology",
  "phone": "+254700100200",
  "email": "info@magoerp.com",
  "motto": "Empowering Education Through Technology"
}
```

---

## PUT /institution/current-session

Set the current active academic session.

**Permissions**: `institution.update`

**Body**:
```json
{
  "academic_session_id": "uuid"
}
```
