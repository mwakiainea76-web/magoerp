<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicYear;
use App\Models\CertificationAuthority;
use App\Models\CertificationLevel;
use App\Models\CourseCurriculum;
use App\Models\Curriculum;
use App\Models\Course;
use App\Models\Departments;
use App\Models\FeePlan;
use App\Models\Role;
use App\Models\staffs;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    public function __invoke(Request $request, string $resource): JsonResponse
    {
        $limit = max(1, min((int) $request->integer('limit', 5), 20));
        $search = trim((string) $request->string('q', ''));

        return match ($resource) {
            'staffs' => $this->staffs($request, $search, $limit),
            'certification-authorities' => $this->certificationAuthorities($request, $search, $limit),
            'certification-levels' => $this->certificationLevels($request, $search, $limit),
            'courses' => $this->courses($request, $search, $limit),
            'course-curricula' => $this->courseCurricula($request, $search, $limit),
            'curricula' => $this->curricula($request, $search, $limit),
            'departments' => $this->departments($request, $search, $limit),
            'academic-years' => $this->academicYears($request, $search, $limit),
            'academic-sessions' => $this->academicSessions($request, $search, $limit),
            'fee-plans' => $this->feePlans($request, $search, $limit),
            'roles' => $this->roles($request, $search, $limit),
            'students' => $this->students($request, $search, $limit),
            default => response()->json([
                'message' => 'Lookup resource not found.',
            ], 404),
        };
    }

    private function staffs(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $staffs = staffs::query()
            ->where('status', true)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_number', 'like', "%{$search}%");
                });
            })
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->limit($limit)
            ->get()
            ->map(function (staffs $staff) {
                $name = trim(collect([$staff->first_name, $staff->middle_name, $staff->last_name])->filter()->implode(' '));

                return [
                    'id' => $staff->id,
                    'label' => trim($staff->employee_number . ' ' . $name),
                ];
            })
            ->values();

        return response()->json([
            'data' => $staffs,
        ]);
    }

    private function curricula(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $curricula = Curriculum::query()
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (Curriculum $curriculum) => [
                'id' => $curriculum->id,
                'label' => trim($curriculum->code . ' ' . $curriculum->name),
            ])
            ->values();

        return response()->json([
            'data' => $curricula,
        ]);
    }

    private function certificationLevels(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $authorityId = (string) $request->string('authority_id', '');

        $levels = CertificationLevel::query()
            ->where('is_active', true)
            ->when($authorityId !== '', fn ($q) => $q->where('certification_authority_id', $authorityId))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (CertificationLevel $level) => [
                'id' => $level->id,
                'label' => trim($level->name . ' (' . $level->code . ')'),
            ])
            ->values();

        return response()->json([
            'data' => $levels,
        ]);
    }

    private function departments(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $depts = Departments::query()
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (Departments $dept) => [
                'id' => $dept->id,
                'label' => trim($dept->name . ' (' . $dept->code . ')'),
            ])
            ->values();

        return response()->json([
            'data' => $depts,
        ]);
    }

    private function courseCurricula(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $items = CourseCurriculum::query()
            ->with('course.authority', 'course.level', 'curriculum', 'course.department')
            ->where('is_active', true)
            ->whereHas('course', fn ($q) => $q->where('is_active', true))
            ->whereHas('curriculum', fn ($q) => $q->where('is_active', true))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->whereHas('course', fn ($cq) => $cq
                            ->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('curriculum', fn ($cq) => $cq
                            ->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('course.level', fn ($lq) => $lq
                            ->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->map(fn (CourseCurriculum $cc) => [
                'id' => $cc->id,
                'label' => collect([
                    $cc->course?->name,
                    $cc->curriculum?->name,
                    $cc->course?->level?->name,
                ])->filter()->implode(' - '),
            ])
            ->values();

        return response()->json([
            'data' => $items,
        ]);
    }

    private function academicYears(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $years = AcademicYear::query()
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (AcademicYear $year) => [
                'id' => $year->id,
                'label' => trim($year->name . ' (' . $year->code . ')'),
            ])
            ->values();

        return response()->json([
            'data' => $years,
        ]);
    }

    private function academicSessions(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $yearId = (string) $request->string('year_id', '');

        $sessions = AcademicSession::query()
            ->where('is_active', true)
            ->when($yearId !== '', fn ($q) => $q->where('academic_year_id', $yearId))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (AcademicSession $session) => [
                'id' => $session->id,
                'label' => trim($session->name . ' (' . $session->code . ')'),
            ])
            ->values();

        return response()->json([
            'data' => $sessions,
        ]);
    }

    private function feePlans(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $plans = FeePlan::query()
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (FeePlan $plan) => [
                'id' => $plan->id,
                'label' => trim($plan->code . ' ' . $plan->name),
            ])
            ->values();

        return response()->json([
            'data' => $plans,
        ]);
    }

    private function roles(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('staff.view'), 403);

        $roles = Role::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->name,
                'label' => ucfirst($role->name),
            ])
            ->values();

        return response()->json([
            'data' => $roles,
        ]);
    }

    private function courses(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $items = Course::query()
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('initials', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'label' => trim($course->code . ' ' . $course->name),
            ])
            ->values();

        return response()->json([
            'data' => $items,
        ]);
    }

    private function certificationAuthorities(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $authorities = CertificationAuthority::query()
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (CertificationAuthority $authority) => [
                'id' => $authority->id,
                'label' => trim($authority->code . ' ' . $authority->name),
            ])
            ->values();

        return response()->json([
            'data' => $authorities,
        ]);
    }

    private function students(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('students.view'), 403);

        $items = Student::query()
            ->with('user:id,phone_number')
            ->where('status', true)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('admission_number', 'like', "%{$search}%");
                });
            })
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->limit($limit)
            ->get()
            ->map(function (Student $student) {
                $name = trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' '));

                return [
                    'id' => $student->id,
                    'label' => trim($student->admission_number . ' ' . $name),
                ];
            })
            ->values();

        return response()->json([
            'data' => $items,
        ]);
    }
}