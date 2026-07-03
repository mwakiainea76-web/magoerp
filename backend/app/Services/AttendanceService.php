<?php

namespace App\Services;

use App\Models\ClassAttendance;
use App\Models\StudentUnitRegistration;
use App\Enums\AttendanceStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class AttendanceService
{
    /**
     * Get the roster of students eligible for attendance marking for a given unit.
     * This queries student_unit_registrations to find all students registered for the unit,
     * left-joining existing attendance marks for the given meeting.
     *
     * @param string $unitId
     * @param string|null $date Session date for pre-filling existing marks (Y-m-d)
     * @param string|null $startTime Start time for pre-filling existing marks (H:i)
     * @return Collection
     */
    public function getEligibleRoster(string $unitId, ?string $date = null, ?string $startTime = null): Collection
    {
        $query = StudentUnitRegistration::query()
            ->select([
                'student_unit_registrations.id AS unit_enrolment_id',
                'students.id AS student_id',
                'students.admission_number',
                'users.first_name',
                'users.middle_name',
                'users.last_name',
                'class_attendances.id AS attendance_id',
                'class_attendances.status AS attendance_status',
                'class_attendances.remarks AS attendance_remarks',
            ])
            ->join('academic_session_enrolments', 'academic_session_enrolments.id', '=', 'student_unit_registrations.academic_session_enrolment_id')
            ->join('students', 'students.id', '=', 'academic_session_enrolments.student_id')
            ->join('users', 'users.id', '=', 'students.user_id')
            ->leftJoin('class_attendances', function ($join) use ($date, $startTime, $unitId) {
                $join->on('class_attendances.unit_enrolment_id', '=', 'student_unit_registrations.id')
                    ->where('class_attendances.session_date', '=', $date)
                    ->where('class_attendances.start_time', '=', $startTime)
                    ->where('class_attendances.unit_id', '=', $unitId);
            })
            ->where('student_unit_registrations.unit_id', $unitId)
            ->orderBy('users.first_name')
            ->orderBy('students.admission_number');

        return $query->get();
    }

    /**
     * Get existing attendance marks already saved for this exact meeting,
     * keyed by unit_enrolment_id for the frontend to pre-fill.
     *
     * @param string $unitId
     * @param string $date
     * @param string $startTime
     * @return Collection
     */
    public function getExistingMarks(string $unitId, string $date, string $startTime): Collection
    {
        return ClassAttendance::query()
            ->where('unit_id', $unitId)
            ->where('session_date', $date)
            ->where('start_time', $startTime)
            ->get()
            ->keyBy('unit_enrolment_id');
    }

    /**
     * Bulk upsert attendance marks for a given meeting.
     *
     * Each record in $records must have: unit_enrolment_id, status.
     * Validates every unit_enrolment_id belongs to the given unit_id;
     * rejects the entire request with a clear error if any are invalid.
     *
     * @param string $unitId
     * @param string $date
     * @param string $startTime
     * @param array $records Array of ['unit_enrolment_id' => string, 'status' => string]
     * @param string $createdBy User ID of the trainer marking attendance
     * @return void
     *
     * @throws \InvalidArgumentException if any unit_enrolment_id does not belong to the unit
     */
    public function markAttendance(string $unitId, string $date, string $startTime, array $records, string $createdBy): void
    {
        if (empty($records)) {
            return;
        }

        // Validate that all unit_enrolment_ids belong to this unit
        $enrolmentIds = array_column($records, 'unit_enrolment_id');
        $validIds = StudentUnitRegistration::query()
            ->where('unit_id', $unitId)
            ->whereIn('id', $enrolmentIds)
            ->pluck('id')
            ->flip();

        $invalidIds = [];
        foreach ($enrolmentIds as $eid) {
            if (!isset($validIds[$eid])) {
                $invalidIds[] = $eid;
            }
        }

        if (!empty($invalidIds)) {
            throw new \InvalidArgumentException(
                'The following unit_enrolment_ids do not belong to unit ' . $unitId . ': ' . implode(', ', $invalidIds)
            );
        }

        // Prepare data for upsert
        $now = now();
        $upsertData = [];
        foreach ($records as $record) {
            $upsertData[] = [
                'unit_id' => $unitId,
                'unit_enrolment_id' => $record['unit_enrolment_id'],
                'trainer_id' => $createdBy,
                'session_date' => $date,
                'start_time' => $startTime,
                'status' => $record['status'],
                'remarks' => $record['remarks'] ?? null,
                'created_by' => $createdBy,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::transaction(function () use ($upsertData) {
            // Bulk upsert on the unique key (unit_enrolment_id, session_date, start_time)
            foreach ($upsertData as $data) {
                ClassAttendance::updateOrCreate(
                    [
                        'unit_enrolment_id' => $data['unit_enrolment_id'],
                        'session_date' => $data['session_date'],
                        'start_time' => $data['start_time'],
                    ],
                    $data
                );
            }
        });
    }
}