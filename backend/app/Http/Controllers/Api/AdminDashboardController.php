<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\CourseEnrolment;
use App\Models\departments;
use App\Models\staffs;
use App\Models\Student;
use App\Models\SupportRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $activeStudents = Student::where('status', 'active')->count();
        $departmentsCount = departments::count();
        $activeCourses = Course::where('is_active', true)->count();
        $teachingStaff = staffs::where('status', true)->where('is_teaching_staff', true)->count();
        $activeSessions = AcademicSession::where('is_active', true)->count();
        $pendingRequests = SupportRequest::whereIn('status', ['pending', 'in_review', 'escalated'])->count();
        $totalUsers = User::where('status', true)->count();

        $studentsThisMonth = Student::where('created_at', '>=', now()->startOfMonth())->count();
        $totalStudents = Student::count();
        $totalStaff = staffs::where('status', true)->count();
        $totalCourses = Course::count();

        // Monthly student registrations (last 12 months)
        $monthlyRegistrations = collect(range(11, 0, -1))->map(function ($i) {
            $date = now()->subMonths($i);
            $month = $date->format('Y-m');
            $label = $date->format('M Y');
            $count = Student::whereYear('created_at', $date->year)
                ->whereMonth('created_at', $date->month)
                ->count();
            return ['month' => $month, 'label' => $label, 'count' => $count];
        })->values();

        // Top courses by enrolment
        $topCourses = CourseEnrolment::select('courses.name', DB::raw('COUNT(DISTINCT course_enrolments.student_id) as count'))
            ->join('course_curricula', 'course_curricula.id', '=', 'course_enrolments.course_curriculum_id')
            ->join('courses', 'courses.id', '=', 'course_curricula.course_id')
            ->where('course_enrolments.status', 'enrolled')
            ->groupBy('courses.id', 'courses.name')
            ->orderByDesc('count')
            ->take(5)
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'count' => (int) $r->count]);

        $sessionEnrolments = AcademicSession::where('is_active', true)
            ->withCount('sessionEnrolments')
            ->latest('start_date')
            ->take(5)
            ->get()
            ->map(fn (AcademicSession $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'enrolments_count' => $s->session_enrolments_count,
                'is_active' => $s->is_active,
            ]);

        $recentSupportRequests = SupportRequest::with('student.user:id,first_name,middle_name,last_name')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (SupportRequest $r) => [
                'id' => $r->id,
                'subject' => $r->subject,
                'status' => $r->status,
                'student_name' => $r->student?->user ? trim(collect([$r->student->user->first_name, $r->student->user->middle_name, $r->student->user->last_name])->filter()->implode(' ')) : null,
                'created_at' => $r->created_at?->diffForHumans(),
            ]);

        return response()->json([
            'status_code' => 200,
            'data' => [
                'stats' => [
                    ['label' => 'Active Students', 'value' => number_format($activeStudents), 'icon' => 'users'],
                    ['label' => 'Departments', 'value' => number_format($departmentsCount), 'icon' => 'building'],
                    ['label' => 'Active Courses', 'value' => number_format($activeCourses), 'icon' => 'book'],
                    ['label' => 'Teaching Staff', 'value' => number_format($teachingStaff), 'icon' => 'staff'],
                    ['label' => 'Active Sessions', 'value' => number_format($activeSessions), 'icon' => 'calendar'],
                    ['label' => 'Pending Requests', 'value' => number_format($pendingRequests), 'icon' => 'support'],
                ],
                'counts' => [
                    'users_count' => $totalUsers,
                    'students_this_month' => $studentsThisMonth,
                    'total_students' => $totalStudents,
                    'total_staff' => $totalStaff,
                    'total_courses' => $totalCourses,
                ],
                'monthly_registrations' => $monthlyRegistrations,
                'top_courses' => $topCourses,
                'active_sessions' => $sessionEnrolments,
                'recent_support_requests' => $recentSupportRequests,
            ],
        ]);
    }
}
