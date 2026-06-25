<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\Student;
use App\Models\StudentMark;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StudentMarksController extends Controller
{
    private const ASSESSMENT_TYPES = ['CAT 1', 'CAT 2', 'CAT 3', 'PRAC 1', 'PRAC 2', 'PRAC 3'];

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'unit_id' => 'nullable|string|exists:units,id',
            'assessment_type' => 'nullable|string|max:50',
            'student_id' => 'nullable|string|exists:students,id',
        ]);

        $query = StudentMark::query()
            ->with([
                'student:id,first_name,middle_name,last_name,admission_number',
                'unit:id,code,name',
                'academicSession:id,name',
                'recordedBy:id,first_name,last_name',
            ]);

        if ($sessionId = $validated['academic_session_id'] ?? null) {
            $query->where('academic_session_id', $sessionId);
        }
        if ($unitId = $validated['unit_id'] ?? null) {
            $query->where('unit_id', $unitId);
        }
        if ($type = $validated['assessment_type'] ?? null) {
            if (in_array($type, self::ASSESSMENT_TYPES, true)) {
                [$assessmentType, $assessmentNumber] = $this->parseAssessmentType($type);
                $query->where('assessment_type', $assessmentType)
                    ->where('assessment_number', $assessmentNumber);
            } else {
                $query->where('assessment_type', $type);
            }
        }
        if ($studentId = $validated['student_id'] ?? null) {
            $query->where('student_id', $studentId);
        }

        $marks = $query->latest()->paginate($request->get('per_page', 50));

        return response()->json(array_merge([], ($marks)->toArray()), 200);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'unit_id' => 'required|string|exists:units,id',
            'student_admission_number' => 'required|string|exists:students,admission_number',
            'assessment_type' => ['required', 'string', Rule::in(self::ASSESSMENT_TYPES)],
            'score' => 'required|integer|min:0|max:100',
        ]);

        $user = $request->user();
        $staffId = null;
        if ($user && $user->staff) {
            $staffId = $user->staff->id;
        }

        $student = Student::where('admission_number', $validated['student_admission_number'])->firstOrFail();
        $registration = $this->resolveUnitRegistration(
            $validated['academic_session_id'],
            $student->id,
            $validated['unit_id'],
        );
        [$assessmentType, $assessmentNumber] = $this->parseAssessmentType($validated['assessment_type']);

        $exists = StudentMark::where([
            'academic_session_id' => $validated['academic_session_id'],
            'student_id' => $student->id,
            'unit_id' => $validated['unit_id'],
            'assessment_type' => $assessmentType,
            'assessment_number' => $assessmentNumber,
        ])->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A score already exists for this student, unit, session, and assessment type.',
            ], 409);
        }

        $mark = StudentMark::create([
            'academic_session_id' => $validated['academic_session_id'],
            'academic_session_enrolment_id' => $registration->academic_session_enrolment_id,
            'student_id' => $student->id,
            'unit_id' => $validated['unit_id'],
            'assessment_type' => $assessmentType,
            'assessment_number' => $assessmentNumber,
            'score' => $validated['score'],
            'marks' => $validated['score'],
            'recorded_by_staff_id' => $staffId,
        ]);

        $mark->load([
            'student:id,first_name,middle_name,last_name,admission_number',
            'unit:id,code,name',
            'academicSession:id,name',
        ]);

        return response()->json([ 'data' => $mark], 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'marks' => 'required|array|min:1',
            'marks.*.academic_session_id' => 'required|string|exists:academic_sessions,id',
            'marks.*.unit_id' => 'required|string|exists:units,id',
            'marks.*.student_admission_number' => 'required|string|exists:students,admission_number',
            'marks.*.assessment_type' => ['required', 'string', Rule::in(self::ASSESSMENT_TYPES)],
            'marks.*.score' => 'required|integer|min:0|max:100',
        ]);

        $user = $request->user();
        $staffId = null;
        if ($user && $user->staff) {
            $staffId = $user->staff->id;
        }

        $created = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($validated['marks'] as $entry) {
                $student = Student::where('admission_number', $entry['student_admission_number'])->first();
                if (!$student) {
                    $errors[] = "Student {$entry['student_admission_number']} was not found.";
                    continue;
                }

                $registration = StudentUnitRegistration::query()
                    ->where('academic_session_id', $entry['academic_session_id'])
                    ->where('student_id', $student->id)
                    ->where('unit_id', $entry['unit_id'])
                    ->first();

                if (!$registration) {
                    $errors[] = "Student {$entry['student_admission_number']} is not enrolled for this unit in the selected session.";
                    continue;
                }

                [$assessmentType, $assessmentNumber] = $this->parseAssessmentType($entry['assessment_type']);

                $exists = StudentMark::where([
                    'academic_session_id' => $entry['academic_session_id'],
                    'student_id' => $student->id,
                    'unit_id' => $entry['unit_id'],
                    'assessment_type' => $assessmentType,
                    'assessment_number' => $assessmentNumber,
                ])->exists();

                if ($exists) {
                    $errors[] = "Score exists for student {$entry['student_admission_number']} - unit {$entry['unit_id']} - {$entry['assessment_type']}";
                    continue;
                }

                $created[] = StudentMark::create([
                    'academic_session_id' => $entry['academic_session_id'],
                    'academic_session_enrolment_id' => $registration->academic_session_enrolment_id,
                    'student_id' => $student->id,
                    'unit_id' => $entry['unit_id'],
                    'assessment_type' => $assessmentType,
                    'assessment_number' => $assessmentNumber,
                    'score' => $entry['score'],
                    'marks' => $entry['score'],
                    'recorded_by_staff_id' => $staffId,
                ]);
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([ 'message' => 'Bulk operation failed: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'data' => $created,
            'errors' => $errors,
            'created_count' => count($created),
            'error_count' => count($errors),
        ], 201);
    }

    public function show(StudentMark $studentMark): JsonResponse
    {
        $studentMark->load([
            'student:id,first_name,middle_name,last_name,admission_number',
            'unit:id,code,name',
            'academicSession:id,name',
            'recordedBy:id,first_name,last_name',
        ]);

        return response()->json([ 'data' => $studentMark]);
    }

    public function update(Request $request, StudentMark $studentMark): JsonResponse
    {
        $validated = $request->validate([
            'marks' => 'sometimes|integer|min:0|max:100',
            'score' => 'sometimes|integer|min:0|max:100',
            'assessment_type' => 'sometimes|string|max:50',
            'assessment_number' => 'sometimes|integer|min:1|max:100',
            'is_published' => 'sometimes|boolean',
        ]);

        if (array_key_exists('score', $validated)) {
            $validated['marks'] = $validated['score'];
        } elseif (array_key_exists('marks', $validated)) {
            $validated['score'] = $validated['marks'];
        }

        $studentMark->update($validated);

        $studentMark->load([
            'student:id,first_name,middle_name,last_name,admission_number',
            'unit:id,code,name',
            'academicSession:id,name',
        ]);

        return response()->json([ 'data' => $studentMark]);
    }

    public function togglePublish(StudentMark $studentMark): JsonResponse
    {
        $studentMark->update(['is_published' => !$studentMark->is_published]);

        return response()->json([
            'data' => $studentMark,
            'message' => $studentMark->is_published ? 'Mark published.' : 'Mark unpublished.',
        ]);
    }

    public function publishAssessment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'unit_id' => 'required|string|exists:units,id',
            'assessment_type' => ['required', 'string', Rule::in(self::ASSESSMENT_TYPES)],
            'assessment_number' => 'nullable|integer|min:1',
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'publish' => 'required|boolean',
        ]);

        [$assessmentType, $assessmentNumber] = $this->parseAssessmentType($validated['assessment_type']);

        $query = StudentMark::where([
            'unit_id' => $validated['unit_id'],
            'assessment_type' => $assessmentType,
            'assessment_number' => $assessmentNumber,
            'academic_session_id' => $validated['academic_session_id'],
        ]);

        $count = $query->update(['is_published' => $validated['publish']]);

        return response()->json([
            'message' => $validated['publish']
                ? "{$count} marks published."
                : "{$count} marks unpublished.",
            'updated_count' => $count,
        ]);
    }

    public function availableUnits(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
        ]);

        $user = $request->user();

        if ($user && $user->staff) {
            $units = Unit::query()
                ->whereExists(function ($q) use ($validated) {
                    $q->select(DB::raw(1))
                        ->from('student_unit_registrations')
                        ->whereColumn('student_unit_registrations.unit_id', 'units.id')
                        ->where('student_unit_registrations.academic_session_id', $validated['academic_session_id']);
                })
                ->get(['id', 'code', 'name']);
        } else {
            $units = Unit::query()
                ->whereExists(function ($q) use ($validated) {
                    $q->select(DB::raw(1))
                        ->from('student_unit_registrations')
                        ->whereColumn('student_unit_registrations.unit_id', 'units.id')
                        ->where('student_unit_registrations.academic_session_id', $validated['academic_session_id']);
                })
                ->get(['id', 'code', 'name']);
        }

        return response()->json([ 'data' => $units]);
    }

    public function availableStudents(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'unit_id' => 'required|string|exists:units,id',
        ]);

        $students = Student::query()
            ->select('students.id', 'students.admission_number', 'students.first_name', 'students.middle_name', 'students.last_name')
            ->join('student_unit_registrations', function ($j) use ($validated) {
                $j->on('student_unit_registrations.student_id', '=', 'students.id')
                    ->where('student_unit_registrations.academic_session_id', $validated['academic_session_id'])
                    ->where('student_unit_registrations.unit_id', $validated['unit_id']);
            })
            ->distinct()
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'admission_number' => $s->admission_number,
                'name' => trim(collect([$s->first_name, $s->middle_name, $s->last_name])->filter()->implode(' ')),
            ]);

        return response()->json([ 'data' => $students]);
    }

    public function marksheet(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'unit_id' => 'required|string|exists:units,id',
        ]);

        $students = Student::query()
            ->select('students.id', 'students.admission_number', 'students.first_name', 'students.middle_name', 'students.last_name')
            ->join('student_unit_registrations', function ($j) use ($validated) {
                $j->on('student_unit_registrations.student_id', '=', 'students.id')
                    ->where('student_unit_registrations.academic_session_id', $validated['academic_session_id'])
                    ->where('student_unit_registrations.unit_id', $validated['unit_id']);
            })
            ->distinct()
            ->get();

        $marks = StudentMark::query()
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('unit_id', $validated['unit_id'])
            ->get();

        $assessmentTypes = $marks->pluck('assessment_type')->unique()->values();
        $assessmentNumbers = $marks->pluck('assessment_number')->unique()->sort()->values();

        $marksheet = $students->map(function ($student) use ($marks, $assessmentTypes) {
            $studentMarks = $marks->where('student_id', $student->id);

            $types = [];
            $total = 0;
            $count = 0;

            foreach ($assessmentTypes as $type) {
                $typeMarks = $studentMarks->where('assessment_type', $type);
                if ($typeMarks->isEmpty()) continue;

                $numbers = $typeMarks->mapWithKeys(fn ($m) => [
                    "{$type}_{$m->assessment_number}" => [
                        'score' => $m->score,
                        'marks' => $m->marks,
                        'is_published' => $m->is_published,
                        'id' => $m->id,
                    ],
                ]);

                $sum = $typeMarks->sum('marks');
                $types[$type] = [
                    'marks' => $numbers,
                    'total' => $sum,
                    'count' => $typeMarks->count(),
                ];
                $total += $sum;
                $count += $typeMarks->count();
            }

            return [
                'student' => [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'name' => trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' ')),
                ],
                'types' => $types,
                'total' => $total,
                'average' => $count > 0 ? round($total / $count, 1) : 0,
            ];
        });

        return response()->json([
            'data' => [
                'academic_session' => AcademicSession::find($validated['academic_session_id'], ['id', 'name']),
                'unit' => Unit::find($validated['unit_id'], ['id', 'code', 'name']),
                'assessment_types' => $assessmentTypes,
                'assessment_numbers' => $assessmentNumbers->values(),
                'marksheet' => $marksheet,
            ],
        ]);
    }

    public function myResults(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json([ 'message' => 'Student profile not found.'], 404);
        }

        $sessionEnrolment = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->latest()
            ->first();

        if (!$sessionEnrolment) {
            return response()->json([ 'data' => []]);
        }

        $unitRegistrations = StudentUnitRegistration::query()
            ->where('academic_session_enrolment_id', $sessionEnrolment->id)
            ->with('unit:id,code,name')
            ->get();

        $results = $unitRegistrations->map(function ($reg) use ($student, $sessionEnrolment) {
            $marks = StudentMark::query()
                ->where('student_id', $student->id)
                ->where('unit_id', $reg->unit_id)
                ->where('academic_session_id', $sessionEnrolment->academic_session_id)
                ->where('is_published', true)
                ->get();

            $grouped = $marks->groupBy('assessment_type')->map(function ($typeMarks) {
                return [
                    'type' => $typeMarks->first()->assessment_type,
                    'marks' => $typeMarks->sortBy('assessment_number')->values()->map(fn ($m) => [
                        'number' => $m->assessment_number,
                        'score' => $m->score,
                        'marks' => $m->marks,
                    ]),
                    'total' => $typeMarks->sum('marks'),
                    'count' => $typeMarks->count(),
                ];
            })->values();

            $totalMarks = $marks->sum('marks');
            $totalCount = $marks->count();

            return [
                'unit' => [
                    'id' => $reg->unit->id,
                    'code' => $reg->unit->code,
                    'name' => $reg->unit->name,
                ],
                'assessments' => $grouped,
                'total_marks' => $totalMarks,
                'average' => $totalCount > 0 ? round($totalMarks / $totalCount, 1) : 0,
            ];
        });

        return response()->json([ 'data' => $results]);
    }

    private function parseAssessmentType(string $label): array
    {
        [$type, $number] = explode(' ', $label, 2);

        return [$type, (int) $number];
    }

    private function resolveUnitRegistration(string $sessionId, string $studentId, string $unitId): StudentUnitRegistration
    {
        $registration = StudentUnitRegistration::query()
            ->where('academic_session_id', $sessionId)
            ->where('student_id', $studentId)
            ->where('unit_id', $unitId)
            ->first();

        abort_unless($registration, 422, 'This student is not enrolled for the selected unit in the selected academic session.');

        return $registration;
    }

    public function assessmentTypes(): JsonResponse
    {
        return response()->json([
            'data' => self::ASSESSMENT_TYPES,
        ]);
    }

    public function listSessionsWithMarks(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json([ 'message' => 'Student profile not found.'], 404);
        }

        $sessionIds = StudentMark::query()
            ->where('student_id', $student->id)
            ->distinct()
            ->pluck('academic_session_id');

        $sessions = AcademicSession::whereIn('id', $sessionIds)
            ->get(['id', 'name', 'code']);

        return response()->json([ 'data' => $sessions]);
    }
}
