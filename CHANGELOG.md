# Changelog

## 2026-07-28

### Security Module — Bug fixes & cleanup

**Deleted unused files (11 files):**

- Events: `SecurityEventOccurred`, `RiskThresholdReached`, `AccountLocked`, `SuspiciousActivityDetected`
- Listeners: `LogSecurityEvent`, `HandleRiskThreshold`
- Exceptions: `AccountLockedException`, `RateLimitExceededException`, `FreshAuthenticationRequiredException`
- Unused service: `RateLimitService`
- Rejected feature: `RequireFreshAuthentication` middleware

**Route ordering fix:**

- `DELETE /api/security/sessions/others` moved before `DELETE /api/security/sessions/{securityUserSession}` to prevent route model binding from swallowing `others`

**BehaviorAnalyzer fixes (`checkRepeatedFailures`):**

- Inverted login skip removed (was tracking _everything except_ login failures)
- Counter now atomically incremented via `Cache::increment()` (was reading unchanging cache)
- Threshold event type changed from `BlockedRequest` to `SuspiciousActivity`

**RiskEngine fix (`getDecayedScore`):**

- Changed from call-based decay (5 pts deducted per request) to time-based decay (2 pts per minute)
- Stores `['score', 'ts']` tuple for reliable Carbon serialization with `file` cache driver

**SessionManager fix (`closeAllForUser`):**

- Now invalidates individual session caches after bulk termination

### Finance Module — Initial documentation

- Comprehensive `documentation/finance-module.md` created covering all 12 DB tables, 40+ API endpoints, 23 frontend pages, and full financial data flow
- Double-entry ledger, FIFO allocation, and cached balance designs documented
- All 14 controllers, 5 services, and 12 models catalogued

### Core Academic Setup (Batch 1) — Audit, fixes & documentation

**Route ordering fix:**

- `GET /academic-session-enrolments/unit` moved before `GET /academic-session-enrolments/{academic_session_enrolment}` to prevent route model binding from swallowing `/unit`
- Removed duplicate `unitEnrolments` route definition

**Frontend cleanup (17 files audited):**

- Removed unused `useCallback` from CourseEnrolmentsPage, CoursesPage, AcademicSessionsPage, SessionEnrolmentsPage
- Removed unused `ChevronDown`/`ChevronUp` from CourseEnrolmentsPage
- Removed unused style imports (`labelClassName`, `selectClassName`, `inputClassName`, `inputTextClassName`, `fieldClassName`) from 6 files
- Removed unused `useNavigate`/`navigate` from 5 form pages
- Removed unused `reset` from AcademicSessionsPage
- Added `console.error` to silent catch block in SessionEnrolmentsPage

**Documentation:**

- `documentation/core-academic-module.md` created covering 8 DB tables, 40+ API endpoints, 17 frontend pages, and all relationships
- `CHANGELOG.md` updated

### Assessments & Scheduling (Batch 2) — Audit, fixes & documentation

**Frontend cleanup (13 files audited):**

- **PublishMarksPage**: Fixed logic bug — success toast no longer fires after API failure (added `return` in catch)
- **AddMarksPage**: Removed unused `bodyTextClassName` import; fixed 2 empty catch blocks
- **ExamSeriesPage**: Removed unused `useMemo` import; fixed empty catch block
- **MarksheetPage**: Fixed 3 empty catch blocks; removed dead ternary `{condition ? null : null}`
- **TranscriptPage**: Removed unused `useMemo` import; fixed 3 empty catch blocks
- **ViewMarksPage**: Removed unused `inputClassName` import; removed 2 unused functions (`extractTypeLabel`, `extractNumber`); fixed empty catch block
- **AttendanceIndexPage**: Removed unused `role` variable
- **AttendanceMarkPage**: Removed unused `role` variable
- **CalendarPage**: Removed unused `Trash2` import

**Documentation:**

- `documentation/assessments-scheduling-module.md` created covering 8 DB tables, 40+ API endpoints, 13 frontend pages, and key business logic

### Staff, Students & Support Requests (Batch 3) — Audit, fixes & documentation

**Backend route ordering fix:**

- `GET /support-requests/staff-list` moved before `GET /support-requests/{support_request}` to prevent route model binding from swallowing `staff-list`

**Frontend cleanup (19 files audited):**

- **StaffFormPage**: Removed unused `useNavigate`/`navigate`; fixed `contract_end_date` missing `|| null` guard; removed 3 redundant `setValue` calls after `reset()`; fixed section heading "Section 4" → "Section 3"
- **StudentFormPage**: Removed unused `setValue` from destructuring; added `console.error` to silent `.catch()`
- **CourseTransfersPage**: Removed unused imports `TableFooter`, `labelTextClassName`, `selectClassName`
- **CourseChangePage**: Removed unused `useEffect` import; split try/catch for proper error messages (mappings failure no longer says "Student not found")
- **StudentDashboard**: Removed unused `ShieldCheck` import; fixed NaN bug in `accountBalance` (`Number(undefined)` bypassing `??`); removed dead hidden `<div className="hidden">` progress block
- **MyHostelPage**: Removed unused `Link` import
- **TrainerUnitEnrolmentsPage**: Removed unused imports (`Search`, `inputClassName`, `useAcademicSessionEnrolmentsApi`); removed unused `enrolmentsApi` variable; fixed 3 empty/silent catch blocks with `console.error`
- **AdminSupportRequestsPage**: Removed unused `TableFooter` import
- **AdminSupportRequestDetailPage**: Removed 2 redundant `status !== "resolved"` conditions (always true inside outer guard)
- **CreateSupportRequestPage**: Added `navigate("/support-requests")` after successful submission
- **RoleDashboard**: Removed duplicate progress bar div (`<div className="h-1.5..."/>`) rendered below `<Progress>` component

### Hostel, Certification, Access Control, Institution & System Config (Batch 4) — Audit, fixes & documentation

**Frontend cleanup (22 files audited):**

_Hostel module:_

- **HostelRoomsPage**: Removed 4 unused imports (`useMemo`, `Settings2`, `initialMeta`, `FormInput`); fixed modal not closing after successful save (added `closeModal()` call)
- **HostelsPage**: Removed unused `initialMeta` import
- **HostelAllocationsPage**: Fixed missing `perPage` in useEffect dependency array (stale closure bug)
- **StudentHostelBookingPage**: Removed 2 unused imports (`labelTextClassName`, `inputClassName`)

_Certification module:_

- **CertificationAuthorityFormPage**: Removed unused `useNavigate`/`navigate` and `inputTextClassName`; **fixed missing `getApiErrorMessage` import** (would cause runtime ReferenceError)
- **CertificationLevelFormPage**: Removed unused `useNavigate`/`navigate` and `inputTextClassName`; **fixed missing `getApiErrorMessage` import** (would cause runtime ReferenceError)

_Access Control module:_

- **AccessRolesPage**: Removed 2 unused imports (`labelTextClassName`, `selectClassName`)
- **AccessRoleFormPage**: Removed unused `useNavigate`/`navigate`

_System Config module:_

- **admin/SystemConfigurationsPage**: Removed unused `selectClassName` import
- **setup/SystemConfigurationsPage**: Fixed empty catch block (added `console.error`)

### Admin Dashboard, Auth, Enrolments, Lookup & App (Batch 5) — Audit, fixes & documentation

**Frontend cleanup (14 files audited):**

_Admin Dashboard:_

- **AdminDashboard**: Removed unused `counts` variable from destructuring

_Auth module:_

- **LoginPage**: Fixed empty `.catch()` on logo fetch (silently swallowed failures); fixed infinite skeleton when no logo URL returned (logo never marked as loaded)
- **ResetPasswordPage**: Fixed empty catch block on logout (added `console.error`)
- **PasswordResetPage**: Added mode guard (`modes[mode] ?? modes.staff`) to prevent TypeError on invalid mode prop

_Enrolments module:_

- **CourseEnrolmentsPage**: Removed unused `useMemo` import
- **SessionEnrolmentsPage**: **Fixed missing `useCallback` import** — would cause runtime ReferenceError; removed unused `TableFooter` import
- **StudentStatusLogsPage**: Removed unused `TableFooter` import

_App & Router:_

- **App.jsx**: Added `.catch()` to dynamic route import to prevent unhandled promise rejection
- **AppLayout**: Fixed empty catch block on logout (added `console.error`)
- **RequireAuth**: Added `!user` null guard to prevent premature redirect when auth store hasn't hydrated (user is null but token exists)

### Build

- Frontend build verified: 2810 modules, 0 errors (6th pass)
- Syntax checks passed on all modified PHP files

---

All 5 batches complete. Full ERP audit & documentation finished.
