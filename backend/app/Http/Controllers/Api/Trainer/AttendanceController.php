<?php

namespace App\Http\Controllers\Api\Trainer;

use App\Http\Controllers\Controller;
use App\Http\Requests\MarkAttendanceRequest;
use App\Models\AcademicTimetable;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService,
    ) {}

    /**
     * Get the list of units assigned to the authenticated trainer via timetables.
     */
    public function assignedUnits(Request $request): JsonResponse
    {
        $user = $request->user();
        $staff = $user->staff;

        if ($this->canManageAnyAttendance($user)) {
            $units = AcademicTimetable::query()
                ->with('unit:id,code,name')
                ->get()
                ->pluck('unit')
                ->filter()
                ->unique('id')
                ->values()
                ->map(fn ($u) => [
                    'id' => $u->id,
                    'code' => $u->code,
                    'name' => $u->name,
                ]);

            return response()->json(['data' => $units]);
        }

        if (!$staff) {
            return response()->json(['data' => []]);
        }

        $units = AcademicTimetable::query()
            ->where('trainer_staff_id', $staff->id)
            ->with('unit:id,code,name')
            ->get()
            ->pluck('unit')
            ->unique('id')
            ->values()
            ->map(fn ($u) => [
                'id' => $u->id,
                'code' => $u->code,
                'name' => $u->name,
            ]);

        return response()->json(['data' => $units]);
    }

    /**
     * Get the eligible roster for a given unit, with pre-filled existing marks for the meeting.
     */
    public function roster(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'unit_id' => ['required', 'string', 'exists:units,id'],
            'session_date' => ['nullable', 'date', 'date_format:Y-m-d'],
            'start_time' => ['nullable', 'date_format:H:i'],
        ]);

        $user = $request->user();
        $staff = $user->staff;

        $this->authorizeAttendanceAccess($user, $staff, $validated['unit_id']);


        $roster = $this->attendanceService->getEligibleRoster(
            $validated['unit_id'],
            $validated['session_date'] ?? null,
            $validated['start_time'] ?? null,
        );

        $students = $roster->map(fn ($row) => [
            'unit_enrolment_id' => $row->unit_enrolment_id,
            'student_id' => $row->student_id,
            'admission_number' => $row->admission_number,
            'name' => trim(collect([$row->first_name, $row->middle_name, $row->last_name])->filter()->implode(' ')),
            'attendance_id' => $row->attendance_id,
            'attendance_status' => $row->attendance_status,
            'attendance_remarks' => $row->attendance_remarks,
        ]);

        return response()->json(['data' => $students]);
    }

    /**
     * Bulk mark (upsert) attendance for a unit meeting.
     */
    public function mark(MarkAttendanceRequest $request): JsonResponse
    {
        $user = $request->user();
        $staff = $user->staff;
        $validated = $request->validated();

        $this->authorizeAttendanceAccess($user, $staff, $validated['unit_id']);


        $this->attendanceService->markAttendance(
            $validated['unit_id'],
            $validated['session_date'],
            $validated['start_time'],
            $validated['records'],
            $user->id,
        );

        return response()->json([
            'message' => 'Attendance marked successfully.',
            'data' => $this->attendanceService->getExistingMarks(
                $validated['unit_id'],
                $validated['session_date'],
                $validated['start_time'],
            ),
        ]);
    }

    private function authorizeAttendanceAccess($user, $staff, string $unitId): void
    {
        if ($this->canManageAnyAttendance($user)) {
            abort_unless(
                AcademicTimetable::where('unit_id', $unitId)->exists(),
                403,
                'No timetable exists for this unit.'
            );

            return;
        }

        abort_unless($staff, 403, 'Only trainers can mark attendance.');
        abort_unless(
            AcademicTimetable::where('trainer_staff_id', $staff->id)->where('unit_id', $unitId)->exists(),
            403,
            'You are not assigned to teach this unit.'
        );
    }

    private function canManageAnyAttendance($user): bool
    {
        return (bool) ($user?->hasRole('admin') || $user?->role === 'admin');
    }
}
