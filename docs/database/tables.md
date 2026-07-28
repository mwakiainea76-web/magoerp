# Database Schema

## Conventions

- **Primary keys**: UUID (v4) for all tables, using Laravel's `HasUuids` trait
- **Timestamps**: `created_at`, `updated_at` on all tables
- **Soft Deletes**: `deleted_at` on `staffs`, `students`, `course_enrolments`, `invoices`, `users`
- **Foreign keys**: UUID, named `{singular_model}_id`
- **Indexes**: Foreign keys are indexed; composite unique keys where applicable
- **Charset**: `utf8mb4` / `utf8mb4_unicode_ci`

---

## Table Inventory

| # | Table | Module | Records |
|---|---|---|---|
| 1 | `users` | Auth | User accounts (staff + students) |
| 2 | `staffs` | HR | Employee profiles |
| 3 | `staff_status_logs` | HR | Staff status change audit |
| 4 | `students` | Students | Student profiles |
| 5 | `student_status_logs` | Students | Student status change audit |
| 6 | `departments` | Academic | Academic departments |
| 7 | `courses` | Academic | Course definitions |
| 8 | `course_curricula` | Academic | Course-to-curriculum mappings |
| 9 | `curricula` | Academic | Curriculum definitions |
| 10 | `units` | Academic | Unit/module definitions |
| 11 | `academic_years` | Academic | Academic year records |
| 12 | `academic_sessions` | Academic | Academic sessions within years |
| 13 | `course_enrolments` | Enrolments | Student course enrollment |
| 14 | `academic_session_enrolments` | Enrolments | Student session enrollment |
| 15 | `student_unit_registrations` | Enrolments | Student unit registration |
| 16 | `student_marks` | Assessment | Individual assessment scores |
| 17 | `exam_series` | Assessment | Exam series configurations |
| 18 | `class_attendance` | Assessment | Attendance records |
| 19 | `academic_timetables` | Scheduling | Timetable entries |
| 20 | `lecture_rooms` | Scheduling | Room inventory |
| 21 | `calendar_events` | Calendar | Calendar events |
| 22 | `calendar_event_types` | Calendar | Event type categories |
| 23 | `holiday_sync_logs` | Calendar | Holiday sync tracking |
| 24 | `certification_authorities` | Certification | Exam bodies |
| 25 | `certification_levels` | Certification | Certification levels |
| 26 | `certification_authority_grades` | Certification | Grade bands |
| 27 | `institutions` | System | Institution profiles |
| 28 | `system_configurations` | System | Key-value configuration store |
| 29 | `fee_structures` | Finance | Fee structure templates |
| 30 | `fee_structure_items` | Finance | Line items within fee structures |
| 31 | `course_curriculum_fee_structures` | Finance | Fee-to-curriculum assignments |
| 32 | `invoices` | Finance | Generated invoices |
| 33 | `invoice_items` | Finance | Invoice line items |
| 34 | `payments` | Finance | Payment records |
| 35 | `payment_allocations` | Finance | FIFO payment-to-invoice allocations |
| 36 | `student_ledger_entries` | Finance | Double-entry ledger |
| 37 | `student_account_balances` | Finance | Cached student account balances |
| 38 | `refunds` | Finance | Refund records |
| 39 | `credit_notes` | Finance | Credit note records |
| 40 | `cohort_billing_logs` | Finance | Cohort billing audit log |
| 41 | `finance_reconciliation_logs` | Finance | Reconciliation audit log |
| 42 | `hostels` | Hostel | Hostel properties |
| 43 | `hostel_rooms` | Hostel | Rooms within hostels |
| 44 | `hostel_beds` | Hostel | Beds within rooms |
| 45 | `hostel_allocations` | Hostel | Student-bed assignments |
| 46 | `support_requests` | Support | Support tickets |
| 47 | `security_events` | Security | Security event log |
| 48 | `security_user_sessions` | Security | Active user sessions |
| 49 | `security_user_devices` | Security | Registered user devices |
| 50 | `security_blocked_ips` | Security | Blocked IP addresses |
| 51 | `security_blocked_devices` | Security | Blocked device fingerprints |
| 52 | `security_blocked_users` | Security | Blocked user accounts |
| 53 | `api_monitoring_logs` | Security | API request monitoring |
| 54 | `roles` | Access Control | Spatie roles |
| 55 | `permissions` | Access Control | Spatie permissions |
| 56 | `model_has_roles` | Access Control | Spatie role assignment |
| 57 | `model_has_permissions` | Access Control | Spatie direct permission assignment |
| 58 | `role_has_permissions` | Access Control | Spatie role-permission mapping |
| 59 | `password_reset_tokens` | Auth | Password reset tokens |
| 60 | `personal_access_tokens` | Auth | Sanctum API tokens |
| 61 | `sessions` | Auth | Laravel session storage |
| 62 | `cache` | System | Cache table (when using database cache) |
| 63 | `failed_jobs` | System | Failed queue jobs |
| 64 | `job_batches` | System | Job batch tracking |
| 65 | `migrations` | System | Migration tracking |

---

## Key Tables — Detailed

### `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `login_id` | VARCHAR(255) | UNIQUE |
| `email` | VARCHAR(255) | UNIQUE, nullable |
| `password` | VARCHAR(255) | hashed |
| `status` | BOOLEAN | default true |
| `must_reset_password` | BOOLEAN | default false |
| `last_login_at` | TIMESTAMP | nullable |
| `soft_deletes` | TIMESTAMP | nullable |

**Relationships**: HasOne `staff`, HasOne `student`

**Used by**: Auth, Staff, Students, Security

---

### `staffs`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users.id`, UNIQUE |
| `department_id` | UUID | FK → `departments.id`, nullable |
| `employee_number` | VARCHAR(50) | UNIQUE |
| `first_name` | VARCHAR(255) | |
| `last_name` | VARCHAR(255) | |
| `employment_type` | ENUM | full_time, part_time, contract, intern |
| `status` | BOOLEAN | default true |
| `soft_deletes` | TIMESTAMP | nullable |

**Indexes**: `employee_number` (UNIQUE), `department_id`

**Relationships**: BelongsTo `User`, BelongsTo `Department`, HasMany `headedDepartments`

---

### `students`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users.id`, UNIQUE |
| `admission_number` | VARCHAR(50) | UNIQUE |
| `first_name` | VARCHAR(255) | |
| `last_name` | VARCHAR(255) | |
| `soft_deletes` | TIMESTAMP | nullable |

**Indexes**: `admission_number` (UNIQUE), `user_id` (UNIQUE)

**Relationships**: BelongsTo `User`, HasMany `CourseEnrolment`, HasMany `AcademicSessionEnrolment`, HasMany `StudentUnitRegistration`

---

### `course_enrolments`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → `students.id` |
| `course_curriculum_id` | UUID | FK → `course_curricula.id` |
| `academic_session_id` | UUID | FK → `academic_sessions.id`, nullable |
| `status` | ENUM | enrolled, deferred, expelled, transferred, completed, withdrawn |
| `soft_deletes` | TIMESTAMP | nullable |

**Indexes**: UNIQUE `(student_id, course_curriculum_id)`, `student_id`, `course_curriculum_id`, `status`

**Relationships**: BelongsTo `Student`, BelongsTo `CourseCurriculum`, HasMany `AcademicSessionEnrolment`

---

### `invoices`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → `students.id` |
| `invoice_number` | VARCHAR(50) | UNIQUE |
| `total_amount` | DECIMAL(15,2) | |
| `balance_due` | DECIMAL(15,2) | |
| `status` | ENUM | draft, issued, paid, cancelled, partially_paid |
| `soft_deletes` | TIMESTAMP | nullable |

**Indexes**: `invoice_number` (UNIQUE), `student_id`, `status`

**Relationships**: BelongsTo `Student`, HasMany `InvoiceItem`, HasMany `PaymentAllocation`

---

### `student_ledger_entries`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → `students.id` |
| `type` | ENUM | debit, credit |
| `amount` | DECIMAL(15,2) | |
| `description` | TEXT | nullable |
| `reference_type` | VARCHAR(100) | invoice, payment, refund, credit_note |
| `reference_id` | UUID | nullable (polymorphic) |

**Indexes**: `student_id`, `type`, `reference_type`, `reference_id`

**Relationships**: BelongsTo `Student`

---

### `security_events`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users.id`, nullable |
| `event_type` | VARCHAR(100) | |
| `description` | TEXT | nullable |
| `metadata` | JSON | nullable |
| `ip_address` | VARCHAR(45) | |
| `user_agent` | TEXT | nullable |
| `severity` | ENUM | info, warning, critical |

**Indexes**: `user_id`, `event_type`, `ip_address`, `severity`, `created_at`

---

### Spatie Permission Tables

```
roles:
  id (UUID), name, guard_name, created_at, updated_at

permissions:
  id (UUID), name, guard_name, created_at, updated_at

model_has_roles:
  role_id (UUID), model_type, model_id (UUID)
  PK: (role_id, model_id, model_type)

model_has_permissions:
  permission_id (UUID), model_type, model_id (UUID)
  PK: (permission_id, model_id, model_type)

role_has_permissions:
  permission_id (UUID), role_id (UUID)
  PK: (permission_id, role_id)
```

---

## Entity Relationship Summary

```
User (1) ──── (0..1) Staff
User (1) ──── (0..1) Student

Student (1) ──── (0..N) CourseEnrolment
CourseEnrolment (1) ──── (0..N) AcademicSessionEnrolment
AcademicSessionEnrolment (1) ──── (0..N) StudentUnitRegistration
StudentUnitRegistration (1) ──── (1) Unit

AcademicYear (1) ──── (0..N) AcademicSession
AcademicSession (1) ──── (0..N) AcademicSessionEnrolment
AcademicSession (1) ──── (0..N) AcademicTimetable

Student (1) ──── (0..N) StudentMark (through unit registration)
Student (1) ──── (0..N) Invoice
Invoice (1) ──── (0..N) PaymentAllocation
PaymentAllocation (0..N) ──── (1) Payment
Student (1) ──── (0..N) StudentLedgerEntry

Course (1) ──── (0..N) CourseCurriculum
CourseCurriculum (1) ──── (0..N) CurriculumFeeStructure
Curriculum (1) ──── (0..N) CourseCurriculum

CertificationAuthority (1) ──── (0..N) CertificationLevel
CertificationAuthority (1) ──── (0..N) CertificationAuthorityGrade

Hostel (1) ──── (0..N) HostelRoom
HostelRoom (1) ──── (0..N) HostelBed
HostelBed (1) ──── (0..1) HostelAllocation
Student (1) ──── (0..N) HostelAllocation
```
