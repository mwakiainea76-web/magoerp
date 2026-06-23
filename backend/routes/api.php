<?php

use App\Http\Controllers\Api\AccessRolePermissionsController;
use App\Http\Controllers\Api\AccessRolesController;
use App\Http\Controllers\Api\AcademicSessionsController;
use App\Http\Controllers\Api\AcademicYearsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CertificationAuthoritiesController;
use App\Http\Controllers\Api\CertificationLevelsController;
use App\Http\Controllers\Api\CourseEnrolmentsController;
use App\Http\Controllers\Api\CourseFeePlansController;
use App\Http\Controllers\Api\CoursesController;
use App\Http\Controllers\Api\CurriculaController;
use App\Http\Controllers\Api\DepartmentsController;
use App\Http\Controllers\Api\FeePlanCourseAssignmentsController;
use App\Http\Controllers\Api\FeePlanItemsController;
use App\Http\Controllers\Api\FeePlansController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\StaffsController;
use App\Http\Controllers\Api\StudentDashboardController;
use App\Http\Controllers\Api\StudentsController;
use App\Http\Controllers\Api\UnitsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/me', [AuthController::class, 'me']);
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

    Route::apiResource('fee-plans', FeePlansController::class)
        ->parameters(['fee-plans' => 'fee_plan']);

    Route::apiResource('fee-plan-items', FeePlanItemsController::class)
        ->parameters(['fee-plan-items' => 'fee_plan_item']);

    Route::get('/fee-plans/{fee_plan}/course-assignments', [FeePlanCourseAssignmentsController::class, 'index']);
    Route::post('/fee-plans/{fee_plan}/course-assignments', [FeePlanCourseAssignmentsController::class, 'store']);
    Route::put('/fee-plans/{fee_plan}/course-assignments/{course_fee_plan}', [FeePlanCourseAssignmentsController::class, 'update']);
    Route::delete('/fee-plans/{fee_plan}/course-assignments/{course_fee_plan}', [FeePlanCourseAssignmentsController::class, 'destroy']);

    Route::get('/staffs/meta', [StaffsController::class, 'meta'])
        ->middleware('permission:staff.create');
    Route::apiResource('staffs', StaffsController::class)
        ->parameters(['staffs' => 'staff']);

    Route::get('/students/meta', [StudentsController::class, 'meta'])
        ->middleware('permission:students.create');
    Route::apiResource('students', StudentsController::class)
        ->parameters(['students' => 'student']);

    Route::get('/course-enrolments', [CourseEnrolmentsController::class, 'index']);
    Route::get('/course-enrolments/{course_enrolment}', [CourseEnrolmentsController::class, 'show']);
    Route::put('/course-enrolments/{course_enrolment}/status', [CourseEnrolmentsController::class, 'updateStatus']);

    Route::get('/access-roles/{access_role}/permissions/grouped', [AccessRolePermissionsController::class, 'grouped']);
    Route::put('/access-roles/{access_role}/permissions', [AccessRolePermissionsController::class, 'sync']);
    Route::apiResource('access-roles', AccessRolesController::class)
        ->parameters(['access-roles' => 'access_role']);
});
