<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicTimetable;
use App\Models\StudentMark;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainerDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $staff = $user->staff;

        if (!$staff) {
            return response()->json([
                'status_code' => 200,
                'data' => [
                    'stats' => [],
                    'assigned_units' => [],
                    'upcoming_classes' => [],
                    'marks_summary' => ['total' => 0, 'published' => 0],
                ],
            ]);
        }

        $currentSession = AcademicSession::where('is_active', true)
            ->whereHas('year', fn ($q) => $q->where('is_active', true))
            ->latest('start_date')
            ->first();

        $timetables = AcademicTimetable::where('trainer_staff_id', $staff->id)
            ->when($currentSession, fn ($q) => $q->where('academic_session_id', $currentSession->id))
            ->with('unit:id,code,name')
            ->get();

        $assignedUnits = $timetables
            ->pluck('unit')
            ->unique('id')
            ->values()
            ->map(fn (Unit $u) => [
                'id' => $u->id,
                'code' => $u->code,
                'name' => $u->name,
            ]);

        $totalStudents = 0;
        if ($currentSession && $assignedUnits->isNotEmpty()) {
            $totalStudents = StudentUnitRegistration::whereIn('unit_id', $assignedUnits->pluck('id'))
                ->whereHas('academicSessionEnrolment', fn ($q) => $q->where('academic_session_id', $currentSession->id))
                ->distinct('academic_session_enrolment_id')
                ->count('academic_session_enrolment_id');
        }

        $today = now()->format('l');
        $currentTime = now()->format('H:i');

        $upcomingClasses = AcademicTimetable::where('trainer_staff_id', $staff->id)
            ->when($currentSession, fn ($q) => $q->where('academic_session_id', $currentSession->id))
            ->where('day_of_week', $this->dayNumber($today))
            ->where('start_time', '>=', $currentTime)
            ->with('unit:id,code,name', 'lectureRoom:id,name')
            ->orderBy('start_time')
            ->take(5)
            ->get()
            ->map(fn (AcademicTimetable $t) => [
                'id' => $t->id,
                'unit_code' => $t->unit?->code,
                'unit_name' => $t->unit?->name,
                'start_time' => $t->start_time,
                'end_time' => $t->end_time,
                'room' => $t->lectureRoom?->name,
                'type' => $t->type,
            ]);

        $unitIds = $assignedUnits->pluck('id');

        $marksCount = StudentMark::whereIn('unit_id', $unitIds)
            ->when($currentSession, function ($q) use ($currentSession) {
                $q->whereHas('academicSessionEnrolment', fn ($sq) => $sq->where('academic_session_id', $currentSession->id));
            })
            ->count();

        $publishedMarks = StudentMark::whereIn('unit_id', $unitIds)
            ->where('is_published', true)
            ->when($currentSession, function ($q) use ($currentSession) {
                $q->whereHas('academicSessionEnrolment', fn ($sq) => $sq->where('academic_session_id', $currentSession->id));
            })
            ->count();

        return response()->json([
            'status_code' => 200,
            'data' => [
                'staff_name' => $staff->first_name ? trim("{$staff->first_name} {$staff->last_name}") : $user->first_name,
                'current_session' => $currentSession?->name,
                'stats' => [
                    ['label' => 'Assigned Units', 'value' => (string) $assignedUnits->count(), 'icon' => 'book'],
                    ['label' => 'Total Students', 'value' => (string) $totalStudents, 'icon' => 'users'],
                    ['label' => 'Marks Recorded', 'value' => (string) $marksCount, 'icon' => 'clipboard'],
                    ['label' => 'Published', 'value' => (string) $publishedMarks, 'icon' => 'check'],
                ],
                'assigned_units' => $assignedUnits,
                'upcoming_classes' => $upcomingClasses,
                'marks_summary' => [
                    'total' => $marksCount,
                    'published' => $publishedMarks,
                ],
            ],
        ]);
    }

    private function dayNumber(string $day): int
    {
        $days = ['Monday' => 1, 'Tuesday' => 2, 'Wednesday' => 3, 'Thursday' => 4, 'Friday' => 5, 'Saturday' => 6, 'Sunday' => 7];
        return $days[$day] ?? 1;
    }
}
