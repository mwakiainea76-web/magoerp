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
            $query->where('assessment_type', $type);
        }
        if ($studentId = $validated['student_id'] ?? null) {
            $query->where('student_id', $studentId);
        }

        $marks = $query->latest()->paginate($request->get('per_page', 50));

        return response()->json($marks);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'academic_session_enrolment_id' => 'required|string|exists:academic_session_enrolments,id',
            'student_id' => 'required|string|exists:students,id',
            'unit_id' => 'required|string|exists:units,id',
            'assessment_type' => 'required|string|max:50',
            'assessment_number' => 'required|integer|min:1|max:100',
            'marks' => 'required|integer|min:0|max:100',
        ]);

        $user = $request->user();
        $staffId = null;
        if ($user && $user->staff) {
            $staffId = $user->staff->id;
        }

        $exists = StudentMark::where([
            'student_id' => $validated['student_id'],
            'unit_id' => $validated['unit_id'],
            'assessment_type' => $validated['assessment_type'],
            'assessment_number' => $validated['assessment_number'],
        ])->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A mark already exists for this student, unit, assessment type, and number.',
            ], 409);
        }

        $mark = StudentMark::create([
            ...$validated,
            'recorded_by_staff_id' => $staffId,
        ]);

        $mark->load([
            'student:id,first_name,middle_name,last_name,admission_number',
            'unit:id,code,name',
            'academicSession:id,name',
        ]);

        return response()->json(['data' => $mark], 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'marks' => 'required|array|min:1',
            'marks.*.academic_session_id' => 'required|string|exists:academic_sessions,id',
            'marks.*.academic_session_enrolment_id' => 'required|string|exists:academic_session_enrolments,id',
            'marks.*.student_id' => 'required|string|exists:students,id',
            'marks.*.unit_id' => 'required|string|exists:units,id',
            'marks.*.assessment_type' => 'required|string|max:50',
            'marks.*.assessment_number' => 'required|integer|min:1|max:100',
            'marks.*.marks' => 'required|integer|min:0|max:100',
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
                $exists = StudentMark::where([
                    'student_id' => $entry['student_id'],
                    'unit_id' => $entry['unit_id'],
                    'assessment_type' => $entry['assessment_type'],
                    'assessment_number' => $entry['assessment_number'],
                ])->exists();

                if ($exists) {
                    $errors[] = "Mark exists for student {$entry['student_id']} - unit {$entry['unit_id']} - {$entry['assessment_type']} #{$entry['assessment_number']}";
                    continue;
                }

                $created[] = StudentMark::create([
                    ...$entry,
                    'recorded_by_staff_id' => $staffId,
                ]);
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Bulk operation failed: ' . $e->getMessage()], 500);
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

        return response()->json(['data' => $studentMark]);
    }

    public function update(Request $request, StudentMark $studentMark): JsonResponse
    {
        $validated = $request->validate([
            'marks' => 'sometimes|integer|min:0|max:100',
            'assessment_type' => 'sometimes|string|max:50',
            'assessment_number' => 'sometimes|integer|min:1|max:100',
            'is_published' => 'sometimes|boolean',
        ]);

        $studentMark->update($validated);

        $studentMark->load([
            'student:id,first_name,middle_name,last_name,admission_number',
            'unit:id,code,name',
            'academicSession:id,name',
        ]);

        return response()->json(['data' => $studentMark]);
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
            'assessment_type' => 'required|string|max:50',
            'assessment_number' => 'required|integer|min:1',
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'publish' => 'required|boolean',
        ]);

        $count = StudentMark::where([
            'unit_id' => $validated['unit_id'],
            'assessment_type' => $validated['assessment_type'],
            'assessment_number' => $validated['assessment_number'],
            'academic_session_id' => $validated['academic_session_id'],
        ])->update(['is_published' => $validated['publish']]);

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
                        ->join('academic_session_enrolments', 'student_unit_registrations.academic_session_enrolment_id', '=', 'academic_session_enrolments.id')
                        ->whereColumn('student_unit_registrations.unit_id', 'units.id')
                        ->where('academic_session_enrolments.academic_session_id', $validated['academic_session_id']);
                })
                ->get(['id', 'code', 'name']);
        } else {
            $units = Unit::query()
                ->whereExists(function ($q) use ($validated) {
                    $q->select(DB::raw(1))
                        ->from('student_unit_registrations')
                        ->join('academic_session_enrolments', 'student_unit_registrations.academic_session_enrolment_id', '=', 'academic_session_enrolments.id')
                        ->whereColumn('student_unit_registrations.unit_id', 'units.id')
                        ->where('academic_session_enrolments.academic_session_id', $validated['academic_session_id']);
                })
                ->get(['id', 'code', 'name']);
        }

        return response()->json(['data' => $units]);
    }

    public function availableStudents(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'unit_id' => 'required|string|exists:units,id',
        ]);

        $students = Student::query()
            ->select('students.id', 'students.admission_number', 'students.first_name', 'students.middle_name', 'students.last_name')
            ->join('academic_session_enrolments', 'students.id', '=', 'academic_session_enrolments.student_id')
            ->join('student_unit_registrations', function ($j) use ($validated) {
                $j->on('student_unit_registrations.academic_session_enrolment_id', '=', 'academic_session_enrolments.id')
                    ->where('student_unit_registrations.unit_id', $validated['unit_id']);
            })
            ->where('academic_session_enrolments.academic_session_id', $validated['academic_session_id'])
            ->distinct()
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'admission_number' => $s->admission_number,
                'name' => trim(collect([$s->first_name, $s->middle_name, $s->last_name])->filter()->implode(' ')),
            ]);

        return response()->json(['data' => $students]);
    }

    public function marksheet(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'unit_id' => 'required|string|exists:units,id',
        ]);

        $students = Student::query()
            ->select('students.id', 'students.admission_number', 'students.first_name', 'students.middle_name', 'students.last_name')
            ->join('academic_session_enrolments', 'students.id', '=', 'academic_session_enrolments.student_id')
            ->join('student_unit_registrations', function ($j) use ($validated) {
                $j->on('student_unit_registrations.academic_session_enrolment_id', '=', 'academic_session_enrolments.id')
                    ->where('student_unit_registrations.unit_id', $validated['unit_id']);
            })
            ->where('academic_session_enrolments.academic_session_id', $validated['academic_session_id'])
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
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $sessionEnrolment = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->latest()
            ->first();

        if (!$sessionEnrolment) {
            return response()->json(['data' => []]);
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

        return response()->json(['data' => $results]);
    }

    public function assessmentTypes(): JsonResponse
    {
        return response()->json([
            'data' => [
                'CAT 1', 'CAT 2', 'CAT 3', 'ASSIGNMENT 1', 'ASSIGNMENT 2',
                'MAIN EXAM', 'PRACTICAL', 'PROJECT', 'QUIZ 1', 'QUIZ 2',
            ],
        ]);
    }

    public function listSessionsWithMarks(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $sessionIds = StudentMark::query()
            ->where('student_id', $student->id)
            ->distinct()
            ->pluck('academic_session_id');

        $sessions = AcademicSession::whereIn('id', $sessionIds)
            ->get(['id', 'name', 'code']);

        return response()->json(['data' => $sessions]);
    }
}
