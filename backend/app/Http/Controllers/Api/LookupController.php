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
use App\Models\FeeTemplate;
use App\Models\Role;
use App\Models\staffs;
use App\Models\Student;
use App\Models\Unit;
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
            'invoice-templates' => $this->invoiceTemplates($request, $search, $limit),
            'roles' => $this->roles($request, $search, $limit),
            'students' => $this->students($request, $search, $limit),
            'units' => $this->units($request, $search, $limit),
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
            ->with('user')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('first_name', 'like', "%{$search}%")
                               ->orWhere('middle_name', 'like', "%{$search}%")
                               ->orWhere('last_name', 'like', "%{$search}%");
                        })
                        ->orWhere('employee_number', 'like', "%{$search}%");
                });
            })
            ->orderBy(\App\Models\User::select('first_name')->whereColumn('users.id', 'staffs.user_id'))
            ->orderBy(\App\Models\User::select('last_name')->whereColumn('users.id', 'staffs.user_id'))
            ->limit($limit)
            ->get()
            ->map(function (staffs $staff) {
                $name = trim(collect([$staff->user->first_name, $staff->user->middle_name, $staff->user->last_name])->filter()->implode(' '));

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
                            ->where('code', 'like', "%{$search}%")
                            ->orWhere('initials', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%"))
                        ->orWhereHas('curriculum', fn ($cq) => $cq
                            ->where('code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%"))
                        ->orWhereHas('course.level', fn ($lq) => $lq
                            ->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->map(fn (CourseCurriculum $cc) => [
                'id' => $cc->id,
                'course_id' => $cc->course_id,
                'curriculum_id' => $cc->curriculum_id,
                'label' => collect([
                    $cc->course?->initials,
                    $cc->course?->name,
                    $cc->curriculum?->code,
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

    private function invoiceTemplates(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $templates = FeeTemplate::query()
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
            ->map(fn (FeeTemplate $template) => [
                'id' => $template->id,
                'label' => trim($template->code . ' ' . $template->name),
            ])
            ->values();

        return response()->json([
            'data' => $templates,
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

    private function units(Request $request, string $search, int $limit): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $items = Unit::query()
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('code')
            ->limit($limit)
            ->get()
            ->map(fn (Unit $unit) => [
                'id' => $unit->id,
                'label' => trim($unit->code . ' - ' . $unit->name),
            ])
            ->values();

        return response()->json([
            'data' => $items,
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
                        ->whereHas('user', function ($uq) use ($search) {
                            $uq->where('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        })
                        ->orWhere('admission_number', 'like', "%{$search}%");
                });
            })
            ->orderBy(User::select('first_name')->whereColumn('users.id', 'students.user_id'))
            ->orderBy(User::select('last_name')->whereColumn('users.id', 'students.user_id'))
            ->limit($limit)
            ->get()
            ->map(function (Student $student) {
                $name = trim(collect([$student->user->first_name, $student->user->middle_name, $student->user->last_name])->filter()->implode(' '));

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
