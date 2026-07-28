# Architecture Overview

## System Context

MagoERP is a **decoupled single-page application (SPA)** architecture. The React frontend communicates with the Laravel backend exclusively through a RESTful JSON API. There is no server-side rendering, Blade templates, or Livewire.

---

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      Browser / Client                         │
│                                                              │
│  React 18 SPA                                                │
│  ┌────────────────────────────────────────────────────┐      │
│  │  @vite/client  │  React Router  │  Zustand Store    │      │
│  │  Recharts      │  Tailwind CSS  │  react-hot-toast  │      │
│  └────────────────────────────────────────────────────┘      │
│                           │                                   │
│                    authClient (Axios)                         │
│               Bearer Token (Authorization header)             │
│               Cookie (magoerp_auth_token)                     │
└───────────────────────────┬──────────────────────────────────┘
                            │
                    HTTPS /api/*
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                       Laravel 11 API                          │
│                                                              │
│  Middleware Pipeline (applied in order):                     │
│  ┌────────────────────────────────────────────────────┐      │
│  │  1. api_token_cookie  (AuthenticateApiTokenCookie)   │      │
│  │  2. auth:sanctum      (Authenticate via token)       │      │
│  │  3. EnsurePasswordResetComplete  (must_reset check)   │      │
│  │  4. security.track-device  (Device fingerprinting)    │      │
│  │  5. security.track-session (Session tracking)         │      │
│  │  6. security.assess       (Risk scoring)              │      │
│  │  7. security.analyze      (Behavior analysis)         │      │
│  │  8. permission:xxx        (Spatie permission gate)    │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  Controllers → Services → Models → Database                  │
│                                                              │
└───────────────────────────┬──────────────────────────────────┘
                            │
                    PDO / MySQL
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                      MySQL / MariaDB                          │
│                                                              │
│  50+ tables covering:                                        │
│  - Academic (courses, curricula, sessions, units)            │
│  - Enrollments (course, session, unit registrations)         │
│  - Finance (fee structures, invoices, payments, ledger)      │
│  - HR (staff, students)                                      │
│  - Accommodation (hostels, rooms, beds, allocations)         │
│  - Security (events, sessions, devices, blocked entities)    │
│  - System (configurations, institutions, support_requests)   │
│  - Spatie permissions (roles, permissions, model_has_roles)  │
└──────────────────────────────────────────────────────────────┘
```

---

## Architectural Principles

### 1. Modular Monolith (API)

The backend is organized by domain into separate controllers, but they share a common database and deploy as a single application. Each domain:

- Has its own **Controller(s)** — handles HTTP concerns
- May have **Services** — encapsulates business logic when complex enough
- Has **Models** — Eloquent ORM with relationships
- Has **Form Requests** — validation and authorization
- Is accessed via **Explicit REST routes** in `routes/api.php`

### 2. RESTful API Conventions

- **Resource naming**: plural nouns (`/api/students`, `/api/fee-structures`)
- **Nested resources**: `/api/certification-authorities/{id}/grades`
- **Operations on resources**: `POST /api/marks/publish-assessment`
- **Static routes before parameterized**: prevents route model binding from swallowing literal path segments like `/export`, `/meta`, `/staff-list`
- **Pagination**: `?page=1&per_page=20` with `meta` in response (total, current_page, last_page, etc.)
- **Sorting**: `?sort_by=name&sort_direction=asc`
- **Search**: `?q=search_term`

### 3. Frontend Organization

- **Feature-based routing** — separate route bundles per role (`admin.routes.jsx`, `trainer.routes.jsx`, etc.)
- **Reusable components** — `DataTable`, `LookupSelect`, `FilterPanel`, `Modal`, `FormButton`, `FormInput`
- **Custom hooks** — each API domain has a dedicated hook wrapping `authClient` calls
- **Zustand store** for auth state — persisted to `localStorage` under key `magoerp.auth`

### 4. Security-First

Every authenticated request passes through a security middleware pipeline that:
1. Extracts the token from cookie or Authorization header
2. Verifies the user is authenticated via Sanctum
3. Checks the user has completed password reset (if required)
4. Tracks the device fingerprint
5. Tracks the session
6. Assesses risk based on behavior
7. Analyzes repeated failures
8. Checks granular permission (where required)

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Sanctum tokens** instead of JWT | Simpler implementation, built into Laravel, cookie + bearer support |
| **File cache driver** instead of Redis | Lower infrastructure requirements; adequate for current scale |
| **Zustand over Redux** | Minimal boilerplate, built-in localStorage persistence |
| **Spatie permissions** with UUID | Compatible with Laravel's UUID primary keys; well-tested library |
| **No service layer for simple CRUD** | Follows Laravel convention; services only where business logic is complex |
| **Role-based route bundles** | Code splitting reduces initial bundle size; each role loads only its pages |

---

## Data Flow Examples

### Student Creates a Support Request

```
StudentDashboard (React)
  → useSupportRequestsApi.create({ subject, description })
    → authClient.post("/api/support-requests", payload)
      → SupportRequestsController@store
        → SupportRequest::create(payload)
        → returns 201 + resource
      ← { id, subject, status: "pending", ... }
    ← toast.success("Request submitted.")
    ← navigate("/support-requests")
```

### Admin Marks Attendance

```
Trainer/Attendance page (React)
  → TrainerAttendanceController@mark({ unit_id, session_date, records })
    → AttendanceService.processAttendance(...)
      → validates student roster
      → upserts class_attendance records
      → returns summary
    ← { marked: 25, updated: 3 }
  ← toast.success("Attendance recorded.")
```

---

## Caching Strategy

- **Cache driver**: `file` (config/cache.php)
- **Risk scores**: stored as `['score', 'ts']` tuples with time-based decay (2 points/minute)
- **Security counters**: atomically incremented via `Cache::increment()`
- **Session cache invalidation**: when admin terminates all sessions for a user, each session's cache key is invalidated
- **No aggressive caching** on academic/financial data — real-time accuracy preferred

---

## Queue & Scheduled Tasks

- **No job queues** currently configured
- **No scheduled tasks** currently configured
- Future: holiday sync, invoice generation, report generation
