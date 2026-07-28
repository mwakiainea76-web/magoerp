# System Configuration API

Base URL: `/api`

---

## GET /system-config

Get all system configuration settings grouped by category.

**Permissions**: `settings.view`

**Response (200)**:
```json
{
  "data": {
    "general": {
      "app_name": "Mago ERP",
      "app_timezone": "Africa/Nairobi",
      "app_locale": "en",
      "items_per_page": 20
    },
    "academic": {
      "auto_generate_admission": true,
      "admission_number_prefix": "ADM-{year}-"
    },
    "finance": {
      "currency": "KES",
      "payment_grace_days": 30,
      "auto_invoice": true
    },
    "security": {
      "max_login_attempts": 5,
      "lockout_duration_minutes": 30,
      "session_lifetime_minutes": 120,
      "password_min_length": 8,
      "require_2fa": false
    },
    "hostel": {
      "auto_allocate": false,
      "max_occupancy_per_room": 4
    }
  }
}
```

---

## PUT /system-config

Update system configuration settings.

**Permissions**: `settings.update`

**Body**:
```json
{
  "security": {
    "max_login_attempts": 3,
    "session_lifetime_minutes": 60
  },
  "general": {
    "items_per_page": 50
  }
}
```

Only the provided categories are updated; others remain unchanged.
