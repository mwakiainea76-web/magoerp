<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\AcademicTimetable;
use App\Models\LectureRoom;
use App\Models\staffs;
use App\Models\Student;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicTimetablesController extends Controller
{
    private const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'unit_id' => 'nullable|string|exists:units,id',
            'trainer_staff_id' => 'nullable|string|exists:staffs,id',
            'lecture_room_id' => 'nullable|string|exists:lecture_rooms,id',
            'day_of_week' => 'nullable|integer|min:0|max:6',
        ]);

        $query = AcademicTimetable::query()
            ->with([
                'unit:id,code,name',
                'trainer:id,first_name,last_name',
                'lectureRoom:id,name,code',
                'academicSession:id,name',
            ]);

        if ($sessionId = $validated['academic_session_id'] ?? null) {
            $query->where('academic_session_id', $sessionId);
        }
        if ($unitId = $validated['unit_id'] ?? null) {
            $query->where('unit_id', $unitId);
        }
        if ($trainerId = $validated['trainer_staff_id'] ?? null) {
            $query->where('trainer_staff_id', $trainerId);
        }
        if ($roomId = $validated['lecture_room_id'] ?? null) {
            $query->where('lecture_room_id', $roomId);
        }
        if (isset($validated['day_of_week'])) {
            $query->where('day_of_week', $validated['day_of_week']);
        }

        $timetables = $query->orderBy('day_of_week')->orderBy('start_time')->get();

        $grouped = [];
        foreach (self::DAYS as $index => $day) {
            $grouped[$day] = $timetables
                ->where('day_of_week', $index)
                ->values()
                ->map(fn ($t) => $this->transform($t));
        }

        return response()->json(['data' => $grouped]);
    }

    public function weekGrid(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'course_curriculum_id' => 'nullable|string|exists:course_curricula,id',
            'staff_id' => 'nullable|string|exists:staffs,id',
            'room_id' => 'nullable|string|exists:lecture_rooms,id',
        ]);

        $query = AcademicTimetable::query()
            ->with(['unit:id,code,name', 'trainer:id,first_name,last_name', 'lectureRoom:id,name,code']);

        if ($sessionId = $validated['academic_session_id'] ?? null) {
            $query->where('academic_session_id', $sessionId);
        } else {
            $activeSession = AcademicSession::where('is_active', true)->latest('start_date')->first();
            if ($activeSession) {
                $query->where('academic_session_id', $activeSession->id);
            }
        }
        if ($curriculumId = $validated['course_curriculum_id'] ?? null) {
            $query->whereHas('unit', fn ($q) => $q->where('course_curriculum_id', $curriculumId));
        }
        if ($staffId = $validated['staff_id'] ?? null) {
            $query->where('trainer_staff_id', $staffId);
        }
        if ($roomId = $validated['room_id'] ?? null) {
            $query->where('lecture_room_id', $roomId);
        }

        $timetables = $query->orderBy('day_of_week')->orderBy('start_time')->get();

        $grid = [];
        foreach (self::DAYS as $index => $day) {
            $grid[$day] = $timetables->where('day_of_week', $index)->values()->map(fn ($t) => $this->transform($t));
        }

        return response()->json([
            'data' => [
                'days' => self::DAYS,
                'grid' => $grid,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'unit_id' => 'required|string|exists:units,id',
            'trainer_staff_id' => 'nullable|string|exists:staffs,id',
            'lecture_room_id' => 'nullable|string|exists:lecture_rooms,id',
            'day_of_week' => 'required|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'type' => 'nullable|string|max:50',
            'recurrence' => 'nullable|string|in:weekly,once',
            'date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if (!$validated['academic_session_id']) {
            $activeSession = AcademicSession::where('is_active', true)->latest('start_date')->first();
            $validated['academic_session_id'] = $activeSession?->id;
        }

        $this->checkOverlap($validated);

        $user = $request->user();

        $timetable = AcademicTimetable::create([
            ...$validated,
            'type' => $validated['type'] ?? 'lecture',
            'recurrence' => $validated['recurrence'] ?? 'weekly',
            'created_by' => $user?->id,
        ]);

        $timetable->load(['unit:id,code,name', 'trainer:id,first_name,last_name', 'lectureRoom:id,name,code', 'academicSession:id,name']);

        return response()->json(['data' => $this->transform($timetable)], 201);
    }

    public function show(AcademicTimetable $academicTimetable): JsonResponse
    {
        $academicTimetable->load([
            'unit:id,code,name',
            'trainer:id,first_name,last_name',
            'lectureRoom:id,name,code',
            'academicSession:id,name',
        ]);

        return response()->json(['data' => $this->transform($academicTimetable)]);
    }

    public function update(Request $request, AcademicTimetable $academicTimetable): JsonResponse
    {
        $validated = $request->validate([
            'unit_id' => 'sometimes|string|exists:units,id',
            'trainer_staff_id' => 'nullable|string|exists:staffs,id',
            'lecture_room_id' => 'nullable|string|exists:lecture_rooms,id',
            'day_of_week' => 'sometimes|integer|min:0|max:6',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'type' => 'nullable|string|max:50',
            'recurrence' => 'nullable|string|in:weekly,once',
            'date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $merged = array_merge($academicTimetable->toArray(), $validated);
        $this->checkOverlap($merged, $academicTimetable->id);

        $user = $request->user();
        $validated['updated_by'] = $user?->id;
        $academicTimetable->update($validated);

        $academicTimetable->load(['unit:id,code,name', 'trainer:id,first_name,last_name', 'lectureRoom:id,name,code', 'academicSession:id,name']);

        return response()->json(['data' => $this->transform($academicTimetable)]);
    }

    public function destroy(AcademicTimetable $academicTimetable): JsonResponse
    {
        $academicTimetable->delete();

        return response()->json(['message' => 'Timetable entry deleted.']);
    }

    public function myTimetable(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->student) {
            return $this->studentTimetable($user->student);
        }

        if ($user->staff) {
            return $this->staffTimetable($user->staff);
        }

        return response()->json(['data' => [], 'message' => 'No timetable available.']);
    }

    public function lectureRooms(Request $request): JsonResponse
    {
        $query = LectureRoom::query()->where('is_active', true);

        if ($departmentId = $request->get('department_id')) {
            $query->where('department_id', $departmentId);
        }

        return response()->json(['data' => $query->get(['id', 'name', 'code', 'capacity', 'location'])]);
    }

    public function storeLectureRoom(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'department_id' => 'nullable|string|exists:departments,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:lecture_rooms,code',
            'capacity' => 'nullable|integer|min:1',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $room = LectureRoom::create($validated);

        return response()->json(['data' => $room], 201);
    }

    public function availableUnits(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'course_curriculum_id' => 'required|string|exists:course_curricula,id',
        ]);

        $query = Unit::query()
            ->where('course_curriculum_id', $validated['course_curriculum_id']);

        if ($search = trim((string) $request->string('q', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $units = $query->get(['id', 'code', 'name']);

        return response()->json(['data' => $units]);
    }

    public function staffList(Request $request): JsonResponse
    {
        return response()->json([
            'data' => staffs::query()
                ->where('status', true)
                ->get(['id', 'first_name', 'last_name', 'employee_number'])
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => trim($s->first_name . ' ' . $s->last_name),
                    'employee_number' => $s->employee_number,
                ]),
        ]);
    }

    private function studentTimetable(Student $student): JsonResponse
    {
        $sessionEnrolment = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->latest()
            ->first();

        if (!$sessionEnrolment) {
            return response()->json(['data' => ['days' => self::DAYS, 'grid' => []]]);
        }

        $unitIds = DB::table('student_unit_registrations')
            ->where('academic_session_enrolment_id', $sessionEnrolment->id)
            ->pluck('unit_id');

        $timetables = AcademicTimetable::query()
            ->whereIn('unit_id', $unitIds)
            ->where('academic_session_id', $sessionEnrolment->academic_session_id)
            ->with(['unit:id,code,name', 'trainer:id,first_name,last_name', 'lectureRoom:id,name,code'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        $grid = [];
        foreach (self::DAYS as $index => $day) {
            $grid[$day] = $timetables->where('day_of_week', $index)->values()->map(fn ($t) => $this->transform($t));
        }

        return response()->json(['data' => ['days' => self::DAYS, 'grid' => $grid]]);
    }

    private function staffTimetable($staff): JsonResponse
    {
        $timetables = AcademicTimetable::query()
            ->where('trainer_staff_id', $staff->id)
            ->with(['unit:id,code,name', 'lectureRoom:id,name,code', 'academicSession:id,name'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        $grid = [];
        foreach (self::DAYS as $index => $day) {
            $grid[$day] = $timetables->where('day_of_week', $index)->values()->map(fn ($t) => $this->transform($t));
        }

        return response()->json(['data' => ['days' => self::DAYS, 'grid' => $grid]]);
    }

    private function transform($timetable): array
    {
        return [
            'id' => $timetable->id,
            'academic_session_id' => $timetable->academic_session_id,
            'session_name' => $timetable->academicSession?->name,
            'unit_id' => $timetable->unit_id,
            'unit_code' => $timetable->unit?->code,
            'unit_name' => $timetable->unit?->name,
            'trainer_staff_id' => $timetable->trainer_staff_id,
            'trainer_name' => $timetable->trainer
                ? trim($timetable->trainer->first_name . ' ' . $timetable->trainer->last_name)
                : null,
            'lecture_room_id' => $timetable->lecture_room_id,
            'room_name' => $timetable->lectureRoom?->name,
            'room_code' => $timetable->lectureRoom?->code,
            'day_of_week' => $timetable->day_of_week,
            'day_name' => self::DAYS[$timetable->day_of_week] ?? 'Unknown',
            'start_time' => $timetable->start_time,
            'end_time' => $timetable->end_time,
            'type' => $timetable->type,
            'recurrence' => $timetable->recurrence,
            'date' => $timetable->date?->format('Y-m-d'),
            'notes' => $timetable->notes,
        ];
    }

    private function checkOverlap(array $data, ?string $excludeId = null): void
    {
        $query = AcademicTimetable::query()
            ->where('day_of_week', $data['day_of_week'])
            ->where(function ($q) use ($data) {
                $q->where(function ($q) use ($data) {
                    $q->where('start_time', '<', $data['end_time'])
                        ->where('end_time', '>', $data['start_time']);
                });
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        $conflicts = (clone $query)->where('lecture_room_id', $data['lecture_room_id'])->exists();
        if ($conflicts) {
            abort(409, 'The lecture room is already booked for this time slot.');
        }

        if (!empty($data['trainer_staff_id'])) {
            $trainerConflict = (clone $query)
                ->where('trainer_staff_id', $data['trainer_staff_id'])
                ->exists();
            if ($trainerConflict) {
                abort(409, 'The trainer already has a session at this time.');
            }
        }

        if (!empty($data['unit_id'])) {
            $unitConflict = (clone $query)
                ->where('unit_id', $data['unit_id'])
                ->exists();
            if ($unitConflict) {
                abort(409, 'This unit already has a session at this time.');
            }
        }
    }
}
