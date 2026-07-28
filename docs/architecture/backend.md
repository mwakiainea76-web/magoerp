# Backend Architecture

## Framework

**Laravel 11** with the following features/components:

| Component | Usage |
|---|---|
| Eloquent ORM | All database access via models with relationships |
| Sanctum | Token-based API authentication |
| Form Requests | Validation + authorization for every create/update |
| Policies | Fine-grained access control per model |
| Middleware | Security pipeline, permission gates |
| Resources | JSON transformations (limited usage) |
| Soft Deletes | Staff, students, course enrolments, invoices |
| UUID Primary Keys | All models use `HasUuids` trait |

---

## Directory Structure

```
backend/
├── app/
│   ├── Console/
│   ├── Exceptions/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── Api/
│   │   │       ├── AuthController.php
│   │   │       ├── StudentsController.php
│   │   │       ├── StaffsController.php
│   │   │       ├── AccessRolesController.php
│   │   │       ├── AcademicSessionEnrolmentsController.php
│   │   │       ├── AcademicSessionsController.php
│   │   │       ├── AcademicTimetablesController.php
│   │   │       ├── AcademicYearsController.php
│   │   │       ├── AdminDashboardController.php
│   │   │       ├── AdminPasswordResetController.php
│   │   │       ├── CertificationAuthoritiesController.php
│   │   │       ├── CertificationAuthorityGradesController.php
│   │   │       ├── CertificationLevelsController.php
│   │   │       ├── Coh⋯ (truncated for brevity)
│   │   │       ├── CourseChangeController.php
│   │   │       ├── CourseEnrolmentsController.php
│   │   │       ├── CoursesController.php
│   │   │       ├── CurriculaController.php
│   │   │       ├── CurriculumFeeStructuresController.php
│   │   │       ├── DepartmentsController.php
│   │   │       ├── FeeStructureController.php
│   │   │       ├── FinanceHealthController.php
│   │   │       ├── FinanceReportsDashboardController.php
│   │   │       ├── HostelRoomsController.php
│   │   │       ├── HostelsController.php
│   │   │       ├── InstitutionsController.php
│   │   │       ├── InvoicesController.php
│   │   │       ├── LectureRoomsController.php
│   │   │       ├── LookupController.php
│   │   │       ├── PaymentsController.php
│   │   │       ├── RefundsController.php
│   │   │       ├── StudentAccountController.php
│   │   │       ├── StudentDashboardController.php
│   │   │       ├── StudentLedgerController.php
│   │   │       ├── StudentMarksController.php
│   │   │       ├── StudentsController.php
│   │   │       ├── SupportRequestsController.php
│   │   │       ├── SystemConfigurationsController.php
│   │   │       ├── UnitsController.php
│   │   │       └── Trainer/
│   │   │           └── AttendanceController.php
│   │   ├── Middleware/
│   │   │   ├── AuthenticateApiTokenCookie.php
│   │   │   └── EnsurePasswordResetComplete.php
│   │   └── Requests/
│   │       └── Api/  (40+ form request classes)
│   ├── Models/  (60+ Eloquent models)
│   ├── Policies/
│   │   ├── CourseEnrolmentPolicy.php
│   │   └── StaffsPolicy.php
│   ├── Services/
│   │   ├── AttendanceService.php
│   │   ├── InvoiceService.php
│   │   ├── PaymentService.php
│   │   ├── FinanceReconciliationService.php
│   │   ├── Traits/
│   │   │   └── FinanceHelpers.php
│   │   ├── Exports/
│   │   │   ├── DataExportService.php
│   │   │   └── StreamingPdfWriter.php
│   │   ├── Security/
│   │   │   ├── BehaviorAnalyzer.php
│   │   │   ├── RiskEngine.php
│   │   │   ├── SessionManager.php
│   │   │   └── SecurityEventService.php
│   │   └── AdmissionNumberService.php
│   └── Exceptions/
├── bootstrap/
├── config/
│   ├── academic.php
│   ├── auth.php
│   ├── cache.php
│   ├── sanctum.php
│   ├── security.php
│   └── ...
├── database/
│   ├── migrations/  (60+ migration files)
│   ├── factories/  (10+ factories)
│   └── seeders/    (15+ seeders)
├── routes/
│   └── api.php     (all 390+ lines of route definitions)
├── storage/
├── tests/
│   └── Feature/
│       ├── FinanceReportsTest.php
│       └── FinanceIntegrityTest.php
└── ...
```

---

## Controller Patterns

### Standard CRUD Controller

```php
class StudentsController extends Controller
{
    use PaginationMeta;

    public function index(Request $request): JsonResponse
    public function meta(Request $request): JsonResponse
    public function store(StoreStudentRequest $request): JsonResponse
    public function show(Student $student): JsonResponse
    public function update(UpdateStudentRequest $request, Student $student): JsonResponse
    public function destroy(Student $student): JsonResponse
    public function export(Request $request): JsonResponse
    public function admissionLetter(Student $student)
}
```

### Invokable Controller (Dashboard)

```php
class AdminDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('dashboard.view');
        // aggregate data from multiple models
        return response()->json([...]);
    }
}
```

### Service Injection

```php
class AcademicSessionEnrolmentsController extends Controller
{
    public function __construct(
        private InvoiceService $invoiceService
    ) {}
}
```

---

## Route Organization

All routes are in `routes/api.php` with the following structure:

```
1. Public routes (no auth):
   POST /api/login
   GET  /api/institution/logo

2. Authenticated routes (auth:sanctum + security middleware):
   2a. User/Auth:
       GET  /api/me
       POST /api/change-password
       POST /api/logout

   2b. Lookup:
       GET  /api/lookups/{resource}

   2c. Academic Setup (departments, courses, curricula, units, sessions):
       GET/POST/PUT/DELETE  /api/departments, /api/courses, etc.

   2d. Certification:
       GET/POST/PUT/DELETE  /api/certification-authorities, etc.

   2e. Staff & Students:
       GET/POST/PUT/DELETE  /api/staffs, /api/students

   2f. Access Control:
       GET/POST/PUT/DELETE  /api/access-roles

   2g. Institution & System Config:
       GET/POST/PUT/DELETE  /api/institutions
       GET/PUT  /api/system-configurations

   2h. Finance:
       GET/POST/PUT/DELETE  /api/fee-structures, /api/invoices, etc.

   2i. Attendance & Marks (admin/trainer):
       GET/POST  /api/marks, /api/attendance/*

   2j. Timetables & Rooms:
       GET/POST/PUT/DELETE  /api/timetables, /api/lecture-rooms

   2k. Calendar:
       GET/POST/PUT/DELETE  /api/academic-sessions/{id}/calendar/*

   2l. Hostel:
       GET/POST/PUT/DELETE  /api/hostels, /api/hostel-rooms

   2m. Support Requests:
       GET/POST  /api/support-requests

   2n. Student Self-Service:
       GET  /api/student/dashboard, /api/my/*

   2o. Security:
       GET/POST  /api/security/*

   2p. Dashboard:
       GET  /api/admin/dashboard
       GET  /api/finance/dashboard
       GET  /api/trainer/dashboard
       GET  /api/student/dashboard
```

---

## Services Layer

Services are used only where business logic is non-trivial:

| Service | Module | Responsibility |
|---|---|---|
| `InvoiceService` | Finance | Fee calculation, invoice generation, credit balance, FIFO allocation |
| `PaymentService` | Finance | Payment processing, FIFO allocation to ledger entries |
| `FinanceReconciliationService` | Finance | Balance verification, reconciliation reports |
| `FinanceHelpers` (Trait) | Finance | Shared finance calculations (currency formatting, tax) |
| `AttendanceService` | Attendance | Bulk attendance upsert logic |
| `DataExportService` | Shared | CSV, XLSX export generation |
| `StreamingPdfWriter` | Shared | PDF generation via streaming |
| `AdmissionNumberService` | Students | Auto-generates admission numbers |
| `BehaviorAnalyzer` | Security | Repeated failure detection, anomaly analysis |
| `RiskEngine` | Security | Risk score with time-based decay |
| `SessionManager` | Security | User session CRUD, bulk termination |
| `SecurityEventService` | Security | Event recording, aggregation queries |

---

## Form Request Validation

Every create/update operation has a dedicated Form Request class:

```php
class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('students.create');
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'course_curriculum_id' => ['required', 'exists:course_curricula,id'],
            // ...
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email is already registered.',
        ];
    }
}
```

---

## Error Handling

Standardized JSON error responses:

```json
{
  "message": "Validation failed.",
  "errors": {
    "email": ["The email field is required."],
    "first_name": ["The first name field is required."]
  }
}
```

| HTTP Status | Meaning |
|---|---|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request |
| 401 | Unauthenticated |
| 403 | Forbidden (permission denied) |
| 404 | Not Found |
| 422 | Validation Error |
| 423 | Locked (password reset required) |
| 429 | Too Many Requests (rate limited) |
| 500 | Server Error |

---

## Trait: PaginationMeta

Used by most controllers that return paginated lists:

```php
trait PaginationMeta
{
    private function meta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }
}
```

Response format:

```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 20,
    "total": 93
  }
}
```
