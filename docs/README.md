# MagoERP — School Management System

A full-featured school management system built with **Laravel 11** (backend API) and **React 18** (SPA frontend) using Vite. The system manages the complete lifecycle of students, staff, academics, finance, accommodation, and institutional operations.

---

## Purpose

MagoERP replaces manual/semi-digital school administration with a unified platform. It serves multiple roles:

- **Administrators** — manage courses, staff, students, enrollment, certification authorities, system configuration
- **Finance Officers** — handle fee structures, invoicing, payments, ledgers, refunds, account balances
- **Trainers (Teachers)** — mark attendance, record assessments, view timetables, manage unit enrollment rosters
- **Students** — self-service dashboard, session/unit registration, view marks, transcripts, fee statements, hostel booking, support requests

---

## Goals

1. **Centralized data** — single source of truth for all academic, financial, and operational records
2. **Role-based access** — granular permissions via Spatie Laravel Permission
3. **Self-service** — students manage their own enrollment, bookings, and support requests
4. **Financial integrity** — double-entry ledger with FIFO allocation, credit balances, automated invoice generation
5. **Security-first** — behavior analysis, risk scoring, device fingerprinting, session management, rate limiting
6. **Extensible** — modular architecture with clear service boundaries and API contracts

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Laravel 11 |
| **PHP Version** | 8.2+ |
| **Frontend Framework** | React 18 |
| **Build Tool** | Vite (2810 modules) |
| **Styling** | Tailwind CSS v4 |
| **State Management** | Zustand |
| **Charts** | Recharts |
| **API** | RESTful JSON API |
| **Authentication** | Laravel Sanctum (token-based) |
| **Authorization** | Spatie Laravel Permission (UUID) |
| **Database** | MySQL / MariaDB |
| **Cache Driver** | File-based |
| **PDF Generation** | Custom streaming PDF writer |
| **Exports** | CSV, XLSX, PDF |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   React SPA                      │
│  (Vite + React 18 + Tailwind + Zustand)          │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Pages     │ │ Layouts  │ │ Components        │ │
│  │ (60+)     │ │ Auth,App │ │ DataTable, Lookup │ │
│  └────┬─────┘ └────┬─────┘ │ Select, Modal...  │ │
│       │            │       └──────────────────┘ │
│  ┌────▼────────────▼─────────────┐               │
│  │  Hooks (46 API hooks)         │               │
│  └────┬─────────────────────────┘               │
│       │ authClient (Axios)                       │
│       │ Bearer Token + Cookie                    │
└───────┼─────────────────────────────────────────┘
        │
        │ HTTPS / JSON
        │
┌───────▼─────────────────────────────────────────┐
│               Laravel 11 API                     │
│                                                   │
│  Middleware Stack:                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Sanctum  │ │ Security │ │ Permission        │ │
│  │ Auth     │ │ Monitor  │ │ Check             │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Controllers (40+)                          │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │ │
│  │  │Academic│ │Finance│ │Staff │ │Security │  │ │
│  │  └──────┘ └──────┘ └──────┘ └──────────┘  │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Services (Invoice, Payment, Finance...)     │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Models (60+)                               │ │
│  └─────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
            ┌──────────────────────┐
            │    MySQL / MariaDB   │
            │    (50+ tables)      │
            └──────────────────────┘
```

---

## Features

### Core Academic
- Departments, Courses, Curricula, Units management
- Academic years and sessions
- Student enrollment (course-level and session-level)
- Unit registration per session

### Assessments & Grading
- Mark entry (single and bulk) with validation
- Marksheet generation with per-student averages
- Transcripts with grade band computation
- Publish/unpublish workflows
- Export (CSV, XLSX, PDF)
- Exam series configuration

### Attendance
- Trainer-facing attendance marking
- Student roster per unit session
- Bulk attendance entry (present/absent/late/excused)

### Timetables & Scheduling
- Weekly timetable grid with conflict detection
- Room, trainer, and unit conflict prevention
- Student and staff personal timetables

### Finance
- Double-entry ledger with FIFO payment allocation
- Fee structure templates with items
- Automated invoice generation (per-session or per-year)
- Payment recording, refunds, credit notes
- Student account balances and fee statements
- Cohort billing
- Finance health checks and reconciliation

### Staff Management
- Full HR profile (personal, employment, academic, disability, next of kin)
- Status change audit logging
- Password reset
- Role assignment at creation

### Student Management
- Admission number generation
- Course curriculum assignment
- Course transfers
- Admission letter generation
- Status change audit logging

### Hostel Management
- Hostel, room, and bed inventory
- Student allocation and self-booking
- Capacity management

### Certification
- Certification authorities and levels
- Grade band configuration (used in transcript computation)

### Security
- Rate limiting (login, API endpoints)
- Device fingerprinting and management
- Session management (single/all sessions)
- Behavior analysis with risk scoring
- Security event monitoring
- Blocked IPs, devices, and users

### Support Requests
- Student-facing ticket submission
- Admin escalation and resolution workflow

### Access Control
- Role creation and management
- Granular permission assignment via Spatie
- Permission grouping and search

---

## Module Map

| Module | Domain | API Routes | Frontend Pages | DB Tables | Module Doc |
|---|---|---|---|---|---|---|
| Departments | Academic | 6 | 2+ | 1 | [`core-academic-module.md`](modules/core-academic-module.md) |
| Courses | Academic | 8 | 2+ | 1 | [`core-academic-module.md`](modules/core-academic-module.md) |
| Curricula | Academic | 7 | 2+ | 1 | [`core-academic-module.md`](modules/core-academic-module.md) |
| Units | Academic | 8 | 2+ | 1 | [`core-academic-module.md`](modules/core-academic-module.md) |
| Academic Sessions | Academic | 8 | 2+ | 1 | [`core-academic-module.md`](modules/core-academic-module.md) |
| Enrolments | Academic | 12 | 3 | 1 | [`enrolments-module.md`](modules/enrolments-module.md) |
| Timetables | Scheduling | 8 | 2+ | 1 | [`assessments-attendance-module.md`](modules/assessments-attendance-module.md) |
| Lecture Rooms | Scheduling | 6 | 2+ | 1 | [`assessments-attendance-module.md`](modules/assessments-attendance-module.md) |
| Calendar | Scheduling | 6 | 1 | 1 | [`assessments-attendance-module.md`](modules/assessments-attendance-module.md) |
| Student Marks | Assessment | 20+ | 6 | 2 | [`assessments-attendance-module.md`](modules/assessments-attendance-module.md) |
| Attendance | Assessment | 3 | 2 | 1 | [`assessments-attendance-module.md`](modules/assessments-attendance-module.md) |
| Staff | HR | 8 | 3 | 2 | [`staff-students-support-module.md`](modules/staff-students-support-module.md) |
| Students | HR | 10 | 5 | 2 | [`staff-students-support-module.md`](modules/staff-students-support-module.md) |
| Support Requests | Communication | 7 | 4 | 1 | [`staff-students-support-module.md`](modules/staff-students-support-module.md) |
| Finance | Finance | 40+ | 15 | 12 | [`finance-module.md`](modules/finance-module.md) |
| Hostel | Accommodation | 12 | 6 | 2 | [`accommodation-module.md`](modules/accommodation-module.md) |
| Certification | Academic | 16 | 4 | 2 | [`certification-module.md`](modules/certification-module.md) |
| Security | System | 20+ | 5+ | 5+ | [`security-module.md`](modules/security-module.md) |
| Access Control | System | 5 | 3 | 2 | [`access-control-module.md`](modules/access-control-module.md) |
| Institution | System | 6 | 1 | 1 | [`institution-module.md`](modules/institution-module.md) |
| System Config | System | 2 | 1 | 1 | [`system-config-module.md`](modules/system-config-module.md) |
| Admin Dashboard | System | 3 | 1 | — | [`admin-dashboard-module.md`](modules/admin-dashboard-module.md) |

---

## Related Documentation

| Document | Location |
|---|---|
| Architecture Overview | [`docs/architecture/overview.md`](architecture/overview.md) |
| Backend Architecture | [`docs/architecture/backend.md`](architecture/backend.md) |
| Frontend Architecture | [`docs/architecture/frontend.md`](architecture/frontend.md) |
| Security Architecture | [`docs/architecture/security.md`](architecture/security.md) |
| Deployment Guide | [`docs/architecture/deployment.md`](architecture/deployment.md) |
| Database Tables Reference | [`docs/database/tables.md`](database/tables.md) |
| Frontend Overview | [`docs/frontend/overview.md`](frontend/overview.md) |
| Deployment Operations | [`docs/operations/deployment.md`](operations/deployment.md) |
| Monitoring & Maintenance | [`docs/operations/monitoring.md`](operations/monitoring.md) |
| ADR: Route Ordering | [`docs/decisions/0001-route-ordering.md`](decisions/0001-route-ordering.md) |
| ADR: Cache Driver | [`docs/decisions/0002-cache-driver.md`](decisions/0002-cache-driver.md) |
| ADR: Risk Scoring | [`docs/decisions/0003-risk-scoring.md`](decisions/0003-risk-scoring.md) |
| ADR: SPA Routing | [`docs/decisions/0004-spa-routing.md`](decisions/0004-spa-routing.md) |

### API Endpoints

| Document | Location |
|---|---|
| Authentication | [`docs/api/authentication.md`](api/authentication.md) |
| Admin Dashboard | [`docs/api/admin-dashboard.md`](api/admin-dashboard.md) |
| Students | [`docs/api/students.md`](api/students.md) |
| Staff | [`docs/api/staff.md`](api/staff.md) |
| Enrolments | [`docs/api/enrolments.md`](api/enrolments.md) |
| Attendance | [`docs/api/attendance.md`](api/attendance.md) |
| Timetables | [`docs/api/timetables.md`](api/timetables.md) |
| Calendar | [`docs/api/calendar.md`](api/calendar.md) |
| Lecture Rooms | [`docs/api/lecture-rooms.md`](api/lecture-rooms.md) |
| Finance | [`docs/api/finance.md`](api/finance.md) |
| Hostel | [`docs/api/hostel.md`](api/hostel.md) |
| Certification | [`docs/api/certification.md`](api/certification.md) |
| Security | [`docs/api/security.md`](api/security.md) |
| Support Requests | [`docs/api/support-requests.md`](api/support-requests.md) |
| Access Control | [`docs/api/access-control.md`](api/access-control.md) |
| Institution | [`docs/api/institution.md`](api/institution.md) |
| System Configuration | [`docs/api/system-config.md`](api/system-config.md) |
| Lookup | [`docs/api/lookup.md`](api/lookup.md) |

### Module Documentation

| Document | Location |
|---|---|
| Core Academic | [`docs/modules/core-academic-module.md`](modules/core-academic-module.md) |
| Enrolments | [`docs/modules/enrolments-module.md`](modules/enrolments-module.md) |
| Assessments & Attendance | [`docs/modules/assessments-attendance-module.md`](modules/assessments-attendance-module.md) |
| Finance | [`docs/modules/finance-module.md`](modules/finance-module.md) |
| Staff, Students & Support | [`docs/modules/staff-students-support-module.md`](modules/staff-students-support-module.md) |
| Accommodation | [`docs/modules/accommodation-module.md`](modules/accommodation-module.md) |
| Certification | [`docs/modules/certification-module.md`](modules/certification-module.md) |
| Security | [`docs/modules/security-module.md`](modules/security-module.md) |
| Access Control | [`docs/modules/access-control-module.md`](modules/access-control-module.md) |
| Institution | [`docs/modules/institution-module.md`](modules/institution-module.md) |
| System Configuration | [`docs/modules/system-config-module.md`](modules/system-config-module.md) |
| Admin Dashboard | [`docs/modules/admin-dashboard-module.md`](modules/admin-dashboard-module.md) |
