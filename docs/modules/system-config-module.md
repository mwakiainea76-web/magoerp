# System Configuration Module

Manages global application settings grouped by category (general, academic, finance, security, hostel).

---

## Architecture

Settings are stored as key-value pairs with a category prefix. The system provides a unified read/write interface.

---

## Backend Structure

```
app/Http/Controllers/Api/SystemConfigController.php
app/Models/SystemConfig.php
```

### Route Registration

```php
Route::get('system-config', [SystemConfigController::class, 'index']);
Route::put('system-config', [SystemConfigController::class, 'update']);
```

### Key Business Logic

- Settings are cached on read for performance; cache is invalidated on update.
- Only provided categories are updated (partial update is supported).
- Validation is defined per setting type (string, integer, boolean).

---

## Frontend Structure

```
frontend/src/views/system-config/
  SystemConfigPage.jsx
```

### Components

- **SystemConfigPage**: Tabbed interface with sections for General, Academic, Finance, Security, and Hostel settings.
- Each section displays relevant settings with appropriate input types (text, number, toggle, select).

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/system-config` | Get all settings |
| PUT | `/api/system-config` | Update settings |

---

## Database Table

- `system_configs` — id, key (unique), value, description, category, type (string/integer/boolean)
