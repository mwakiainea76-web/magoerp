<?php

use App\Http\Controllers\Api\AccessRolePermissionsController;
use App\Http\Controllers\Api\AccessRolesController;
use App\Http\Controllers\Api\AcademicSessionEnrolmentsController;
use App\Http\Controllers\Api\AcademicSessionsController;
use App\Http\Controllers\Api\AcademicTimetablesController;
use App\Http\Controllers\Api\AcademicYearsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CertificationAuthoritiesController;
use App\Http\Controllers\Api\CourseChangeController;
use App\Http\Controllers\Api\ComplaintsController;
use App\Http\Controllers\Api\CertificationLevelsController;
use App\Http\Controllers\Api\CourseEnrolmentsController;
use App\Http\Controllers\Api\CourseCurriculaController;
use App\Http\Controllers\Api\CoursesController;
use App\Http\Controllers\Api\CurriculaController;
use App\Http\Controllers\Api\DepartmentsController;
use App\Http\Controllers\Api\CurriculumFeeAssignmentsController;
use App\Http\Controllers\Api\HostelsController;
use App\Http\Controllers\Api\LectureRoomsController;
use App\Http\Controllers\Api\FeeTemplateItemsController;
use App\Http\Controllers\Api\FeeTemplatesController;
use App\Http\Controllers\Api\StudentFeeAdjustmentsController;
use App\Http\Controllers\Api\InvoicesController;
use App\Http\Controllers\Api\StudentLedgerController;
use App\Http\Controllers\Api\PaymentsController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\StaffsController;
use App\Http\Controllers\Api\StudentDashboardController;
use App\Http\Controllers\Api\StudentMarksController;
use App\Http\Controllers\Api\StudentsController;
use App\Http\Controllers\Api\SystemConfigurationsController;
use App\Http\Controllers\Api\UnitsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware([
    'api_token_cookie',
    'auth:sanctum',
    \App\Http\Middleware\EnsurePasswordResetComplete::class,
])->group(function () {
    Route::get('/user', function (Request $request) {
        return response()->json([
            
            'user' => $request->user(),
        ]);
    });

    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/lookups/{resource}', LookupController::class);

    Route::get('/departments/meta', [DepartmentsController::class, 'meta'])
        ->middleware('permission:institution.view');
    Route::apiResource('departments', DepartmentsController::class)
        ->parameters(['departments' => 'department']);

    Route::apiResource('certification-authorities', CertificationAuthoritiesController::class)
        ->parameters(['certification-authorities' => 'certification_authority']);

    Route::apiResource('certification-levels', CertificationLevelsController::class)
        ->parameters(['certification-levels' => 'certification_level']);

    Route::apiResource('curricula', CurriculaController::class)
        ->parameters(['curricula' => 'curriculum']);

    Route::apiResource('courses', CoursesController::class)
        ->parameters(['courses' => 'course']);

    Route::post('/courses/{course}/curricula', [CoursesController::class, 'attachCurriculum']);
    Route::delete('/courses/{course}/curricula', [CoursesController::class, 'detachCurriculum']);
    Route::patch('/courses/{course}/curricula/toggle', [CoursesController::class, 'toggleCurriculum']);

    Route::get('/student/dashboard', StudentDashboardController::class);

    Route::apiResource('units', UnitsController::class)
        ->parameters(['units' => 'unit']);

    Route::apiResource('academic-years', AcademicYearsController::class)
        ->parameters(['academic-years' => 'academic_year']);

    Route::apiResource('academic-sessions', AcademicSessionsController::class)
        ->parameters(['academic-sessions' => 'academic_session']);

    Route::post('/student/register-session', [AcademicSessionEnrolmentsController::class, 'registerCurrentSession']);
    Route::post('/student/register-units', [AcademicSessionEnrolmentsController::class, 'registerUnits']);
    Route::get('/my/session-enrolments', [AcademicSessionEnrolmentsController::class, 'myEnrolments']);
    Route::get('/my/available-sessions', [AcademicSessionEnrolmentsController::class, 'availableSessions']);
    Route::post('/academic-session-enrolments', [AcademicSessionEnrolmentsController::class, 'store']);
    Route::get('/academic-session-enrolments', [AcademicSessionEnrolmentsController::class, 'index']);
    Route::get('/academic-session-enrolments/{academic_session_enrolment}', [AcademicSessionEnrolmentsController::class, 'show']);

    Route::apiResource('fee-templates', FeeTemplatesController::class)
        ->parameters(['fee-templates' => 'fee_template']);

    Route::apiResource('fee-template-items', FeeTemplateItemsController::class)
        ->parameters(['fee-template-items' => 'fee_template_item']);

    Route::get('/fee-templates/{fee_template}/course-assignments', [CurriculumFeeAssignmentsController::class, 'index']);
    Route::post('/fee-templates/{fee_template}/course-assignments', [CurriculumFeeAssignmentsController::class, 'store']);
    Route::put('/fee-templates/{fee_template}/course-assignments/{curriculum_fee_assignment}', [CurriculumFeeAssignmentsController::class, 'update']);
    Route::delete('/fee-templates/{fee_template}/course-assignments/{curriculum_fee_assignment}', [CurriculumFeeAssignmentsController::class, 'destroy']);

    Route::get('/my/invoices', [InvoicesController::class, 'myInvoices']);
    Route::get('/my/finance-summary', [InvoicesController::class, 'financeSummary']);
    Route::get('/my/ledger', [StudentLedgerController::class, 'myLedger']);
    Route::post('/invoices', [InvoicesController::class, 'store']);
    Route::get('/invoices', [InvoicesController::class, 'index']);
    Route::get('/invoices/{invoice}', [InvoicesController::class, 'show']);
    Route::get('/students/{student}/fee-templates', [InvoicesController::class, 'availableTemplates']);
    Route::post('/payments', [PaymentsController::class, 'store']);
    Route::get('/payments', [PaymentsController::class, 'index']);
    Route::post('/invoices/{invoice}/adjustments', [StudentFeeAdjustmentsController::class, 'store']);
    Route::get('/ledger', [StudentLedgerController::class, 'index']);

    Route::get('/assessment-types', [StudentMarksController::class, 'assessmentTypes']);
    Route::get('/marks', [StudentMarksController::class, 'index']);
    Route::post('/marks', [StudentMarksController::class, 'store']);
    Route::post('/marks/bulk', [StudentMarksController::class, 'bulkStore']);
    Route::post('/marks/publish-assessment', [StudentMarksController::class, 'publishAssessment']);
    Route::post('/marks/publish-filtered', [StudentMarksController::class, 'publishFiltered']);
    Route::get('/marks/available-units', [StudentMarksController::class, 'availableUnits']);
    Route::get('/marks/available-students', [StudentMarksController::class, 'availableStudents']);
    Route::get('/marks/marksheet', [StudentMarksController::class, 'marksheet']);
    Route::get('/marks/{student_mark}', [StudentMarksController::class, 'show']);
    Route::put('/marks/{student_mark}', [StudentMarksController::class, 'update']);
    Route::post('/marks/{student_mark}/toggle-publish', [StudentMarksController::class, 'togglePublish']);
    Route::get('/my/results', [StudentMarksController::class, 'myResults']);
    Route::get('/my/results-sessions', [StudentMarksController::class, 'listSessionsWithMarks']);

    Route::get('/my/timetable', [AcademicTimetablesController::class, 'myTimetable']);
    Route::get('/timetables', [AcademicTimetablesController::class, 'index']);
    Route::get('/timetables/week-grid', [AcademicTimetablesController::class, 'weekGrid']);
    Route::get('/timetables/available-units', [AcademicTimetablesController::class, 'availableUnits']);
    Route::get('/timetables/staff-list', [AcademicTimetablesController::class, 'staffList']);
    Route::post('/timetables', [AcademicTimetablesController::class, 'store']);
    Route::get('/timetables/{academic_timetable}', [AcademicTimetablesController::class, 'show']);
    Route::put('/timetables/{academic_timetable}', [AcademicTimetablesController::class, 'update']);
    Route::delete('/timetables/{academic_timetable}', [AcademicTimetablesController::class, 'destroy']);
    Route::apiResource('lecture-rooms', LectureRoomsController::class)
        ->parameters(['lecture-rooms' => 'lecture_room']);

    Route::get('/my/complaints', [ComplaintsController::class, 'myComplaints']);
    Route::post('/complaints', [ComplaintsController::class, 'store']);
    Route::get('/complaints', [ComplaintsController::class, 'adminIndex']);
    Route::get('/complaints/{complaint}', [ComplaintsController::class, 'show']);
    Route::post('/complaints/{complaint}/escalate', [ComplaintsController::class, 'escalate']);
    Route::post('/complaints/{complaint}/resolve', [ComplaintsController::class, 'resolve']);
    Route::post('/complaints/{complaint}/review', [ComplaintsController::class, 'review']);
    Route::get('/complaints/staff-list', [ComplaintsController::class, 'staffList']);

    Route::get('/my/hostel-allocation', [HostelsController::class, 'myAllocation']);
    Route::get('/my/available-hostels', [HostelsController::class, 'availableHostels']);
    Route::get('/my/hostel-booking/eligibility', [HostelsController::class, 'bookingEligibility']);
    Route::post('/my/hostel-booking', [HostelsController::class, 'selfBook']);
    Route::apiResource('hostels', HostelsController::class)
        ->parameters(['hostels' => 'hostel']);
    Route::post('/hostel-rooms', [HostelsController::class, 'storeRoom']);
    Route::put('/hostel-rooms/{hostel_room}', [HostelsController::class, 'updateRoom']);
    Route::get('/hostels/{hostel}/rooms', [HostelsController::class, 'roomsByHostel']);
    Route::get('/hostel-rooms/{hostel_room}/beds', [HostelsController::class, 'bedsByRoom']);
    Route::get('/hostel-allocations', [HostelsController::class, 'allocations']);
    Route::post('/hostel-allocations', [HostelsController::class, 'storeAllocation']);
    Route::post('/hostel-allocations/{hostel_allocation}/vacate', [HostelsController::class, 'vacateAllocation']);

    Route::get('/staffs/meta', [StaffsController::class, 'meta'])
        ->middleware('permission:staff.create');
    Route::apiResource('staffs', StaffsController::class)
        ->parameters(['staffs' => 'staff']);

    Route::get('/students/meta', [StudentsController::class, 'meta'])
        ->middleware('permission:students.create');
    Route::apiResource('students', StudentsController::class)
        ->parameters(['students' => 'student']);
    Route::get('/students/{student}/admission-letter', [StudentsController::class, 'admissionLetter']);

    Route::post('/course-change/lookup', [CourseChangeController::class, 'lookupStudent']);
    Route::post('/course-change/available-mappings', [CourseChangeController::class, 'availableMappings']);
    Route::post('/course-change/transfer', [CourseChangeController::class, 'store']);
    Route::post('/course-change/history', [CourseChangeController::class, 'history']);
    Route::get('/course-change/transfers', [CourseChangeController::class, 'allTransfers']);

    Route::apiResource('course-curricula', CourseCurriculaController::class)
        ->parameters(['course-curricula' => 'course_curriculum'])
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('/course-enrolments', [CourseEnrolmentsController::class, 'index']);
    Route::get('/course-enrolments/{course_enrolment}', [CourseEnrolmentsController::class, 'show']);
    Route::put('/course-enrolments/{course_enrolment}/status', [CourseEnrolmentsController::class, 'updateStatus']);
    Route::get('/student-status-logs', [CourseEnrolmentsController::class, 'statusLogs']);

    Route::get('/access-roles/{access_role}/permissions/grouped', [AccessRolePermissionsController::class, 'grouped']);
    Route::put('/access-roles/{access_role}/permissions', [AccessRolePermissionsController::class, 'sync']);
    Route::apiResource('access-roles', AccessRolesController::class)
        ->parameters(['access-roles' => 'access_role']);

    Route::get('/system-configurations', [SystemConfigurationsController::class, 'index'])
        ->middleware('permission:institution.update');
    Route::put('/system-configurations/{key}', [SystemConfigurationsController::class, 'update'])
        ->middleware('permission:institution.update');
});
