<?php

namespace App\Http\Controllers\Api;

use Barryvdh\DomPDF\Facade\Pdf;
use App\Exports\DataExportService;
use App\Exports\StreamingPdfWriter;
use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\CertificationAuthorityGrade;
use App\Models\Student;
use App\Models\StudentMark;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentMarksController extends Controller
{
    private const ASSESSMENT_TYPES = ['CAT 1', 'CAT 2', 'CAT 3', 'PRAC 1', 'PRAC 2', 'PRAC 3'];

    public function __construct(
        protected DataExportService $exportService,
        protected StreamingPdfWriter $pdfWriter,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);
        $authenticatedStudent = $this->authenticatedStudent($request);

        $validated = $request->validate([
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'unit_id' => 'nullable|string|exists:units,id',
            'assessment_type' => 'nullable|string|max:50',
            'student_id' => 'nullable|string|exists:students,id',
        ]);

        $query = StudentMark::query()
            ->with([
                'academicSessionEnrolment.student.user:id,first_name,middle_name,last_name',
                'unit:id,code,name',
                'recordedBy:id,first_name,middle_name,last_name',
            ])
            ->when($authenticatedStudent, function ($query, Student $student) {
                $query->where('is_published', true)
                    ->whereHas(
                        'academicSessionEnrolment',
                        fn ($enrolmentQuery) => $enrolmentQuery->where('student_id', $student->id),
                    );
            });

        if ($sessionId = $validated['academic_session_id'] ?? null) {
            $query->whereHas('academicSessionEnrolment', fn ($q) => $q->where('academic_session_id', $sessionId));
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
            $query->whereHas('academicSessionEnrolment', fn ($q) => $q->where('student_id', $studentId));
        }

        $marks = $query->latest()->paginate($request->get('per_page', 50));

        $transformed = $marks->getCollection()->map(fn ($m) => [
            'id' => $m->id,
            'student' => $m->academicSessionEnrolment?->student ? [
                'id' => $m->academicSessionEnrolment->student->id,
                'admission_number' => $m->academicSessionEnrolment->student->admission_number,
                'first_name' => $m->academicSessionEnrolment->student->first_name,
                'middle_name' => $m->academicSessionEnrolment->student->middle_name,
                'last_name' => $m->academicSessionEnrolment->student->last_name,
            ] : null,
            'unit' => $m->unit ? ['id' => $m->unit->id, 'code' => $m->unit->code, 'name' => $m->unit->name] : null,
            'assessment_type' => $m->assessment_type,
            'assessment_number' => $m->assessment_number,
            'score' => $m->score,
            'marks' => $m->marks,
            'is_published' => $m->is_published,
            'recorded_by' => $m->recordedBy ? trim(collect([$m->recordedBy->first_name, $m->recordedBy->middle_name, $m->recordedBy->last_name])->filter()->implode(' ')) : null,
            'created_at' => $m->created_at,
        ]);

        return response()->json([
            'data' => $transformed,
            'total' => $marks->total(),
            'last_page' => $marks->lastPage(),
            'per_page' => $marks->perPage(),
            'current_page' => $marks->currentPage(),
        ], 200);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.create'), 403);

        $validated = $request->validate([
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'unit_id' => 'required|string|exists:units,id',
            'student_admission_number' => 'required|string|exists:students,admission_number',
            'assessment_type' => ['required', 'string', Rule::in(self::ASSESSMENT_TYPES)],
            'score' => 'required|integer|min:0|max:100',
        ]);

        $student = Student::where('admission_number', $validated['student_admission_number'])->firstOrFail();

        if (empty($validated['academic_session_id'])) {
            $session = AcademicSession::query()
                ->where('is_active', true)
                ->latest('start_date')
                ->first();

            if (! $session) {
                return response()->json(['message' => 'No active academic session found.'], 422);
            }

            $validated['academic_session_id'] = $session->id;
        }

        $enrolment = AcademicSessionEnrolment::where('student_id', $student->id)
            ->where('academic_session_id', $validated['academic_session_id'])
            ->first();

        if (! $enrolment) {
            return response()->json(['message' => 'Student is not enrolled in this academic session.'], 422);
        }

        $registration = StudentUnitRegistration::where('academic_session_enrolment_id', $enrolment->id)
            ->where('unit_id', $validated['unit_id'])
            ->first();

        if (! $registration) {
            return response()->json(['message' => 'Student is not enrolled for this unit in the selected session.'], 422);
        }

        $user = $request->user();

        [$assessmentType, $assessmentNumber] = $this->parseAssessmentType($validated['assessment_type']);

        $exists = StudentMark::where('academic_session_enrolment_id', $enrolment->id)
            ->where('unit_id', $validated['unit_id'])
            ->where('assessment_type', $assessmentType)
            ->where('assessment_number', $assessmentNumber)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A score already exists for this student, unit, session, and assessment type.',
            ], 409);
        }

        $mark = StudentMark::create([
            'academic_session_enrolment_id' => $enrolment->id,
            'unit_id' => $validated['unit_id'],
            'assessment_type' => $assessmentType,
            'assessment_number' => $assessmentNumber,
            'score' => $validated['score'],
            'marks' => 100,
            'recorded_by' => $user?->id,
        ]);

        $mark->load(['academicSessionEnrolment.student.user:id,first_name,middle_name,last_name', 'unit:id,code,name']);

        return response()->json(['data' => $mark], 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.create'), 403);

        $validated = $request->validate([
            'marks' => 'required|array|min:1',
            'marks.*.academic_session_id' => 'required|string|exists:academic_sessions,id',
            'marks.*.unit_id' => 'required|string|exists:units,id',
            'marks.*.student_admission_number' => 'required|string|exists:students,admission_number',
            'marks.*.assessment_type' => ['required', 'string', Rule::in(self::ASSESSMENT_TYPES)],
            'marks.*.score' => 'required|integer|min:0|max:100',
        ]);

        $user = $request->user();

        $admissionNumbers = collect($validated['marks'])->pluck('student_admission_number')->unique();
        $students = Student::whereIn('admission_number', $admissionNumbers)->get()->keyBy('admission_number');

        $sessionIds = collect($validated['marks'])->pluck('academic_session_id')->unique();
        $unitIds = collect($validated['marks'])->pluck('unit_id')->unique();

        $enrolments = AcademicSessionEnrolment::whereIn('student_id', $students->pluck('id'))
            ->whereIn('academic_session_id', $sessionIds)
            ->get()
            ->keyBy(fn ($e) => "{$e->academic_session_id}|{$e->student_id}");

        $enrolmentIds = $enrolments->pluck('id');
        $registrations = StudentUnitRegistration::whereIn('academic_session_enrolment_id', $enrolmentIds)
            ->whereIn('unit_id', $unitIds)
            ->get()
            ->keyBy(fn ($r) => "{$r->academic_session_enrolment_id}|{$r->unit_id}");

        $existingMarks = StudentMark::whereIn('academic_session_enrolment_id', $enrolmentIds)
            ->whereIn('unit_id', $unitIds)
            ->get()
            ->keyBy(fn ($m) => "{$m->academic_session_enrolment_id}|{$m->unit_id}|{$m->assessment_type}|{$m->assessment_number}");

        $created = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($validated['marks'] as $entry) {
                $student = $students->get($entry['student_admission_number']);
                if (! $student) {
                    $errors[] = "Student {$entry['student_admission_number']} was not found.";

                    continue;
                }

                $enrol = $enrolments->get("{$entry['academic_session_id']}|{$student->id}");
                if (! $enrol) {
                    $errors[] = "Student {$entry['student_admission_number']} is not enrolled in the session.";

                    continue;
                }

                $reg = $registrations->get("{$enrol->id}|{$entry['unit_id']}");
                if (! $reg) {
                    $errors[] = "Student {$entry['student_admission_number']} is not enrolled for this unit.";

                    continue;
                }

                [$assessmentType, $assessmentNumber] = $this->parseAssessmentType($entry['assessment_type']);

                $markKey = "{$enrol->id}|{$entry['unit_id']}|{$assessmentType}|{$assessmentNumber}";
                if ($existingMarks->has($markKey)) {
                    $errors[] = "Score exists for student {$entry['student_admission_number']} - unit {$entry['unit_id']} - {$entry['assessment_type']}";

                    continue;
                }

                $created[] = StudentMark::create([
                    'academic_session_enrolment_id' => $enrol->id,
                    'unit_id' => $entry['unit_id'],
                    'assessment_type' => $assessmentType,
                    'assessment_number' => $assessmentNumber,
                    'score' => $entry['score'],
                    'marks' => 100,
                    'recorded_by' => $user?->id,
                ]);
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json(['message' => 'Bulk operation failed: '.$e->getMessage()], 500);
        }

        return response()->json([
            'data' => $created,
            'errors' => $errors,
            'created_count' => count($created),
            'error_count' => count($errors),
        ], 201);
    }

    public function show(Request $request, StudentMark $studentMark): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);
        $authenticatedStudent = $this->authenticatedStudent($request);

        if ($authenticatedStudent) {
            abort_unless(
                $studentMark->is_published
                && $studentMark->academicSessionEnrolment()
                    ->where('student_id', $authenticatedStudent->id)
                    ->exists(),
                403,
            );
        }

        $studentMark->load([
            'academicSessionEnrolment.student.user:id,first_name,middle_name,last_name',
            'unit:id,code,name',
            'recordedBy:id,first_name,middle_name,last_name',
        ]);

        return response()->json(['data' => $studentMark]);
    }

    public function update(Request $request, StudentMark $studentMark): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.create'), 403);

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
            'academicSessionEnrolment.student.user:id,first_name,middle_name,last_name',
            'unit:id,code,name',
        ]);

        return response()->json(['data' => $studentMark]);
    }

    public function togglePublish(Request $request, StudentMark $studentMark): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.publish'), 403);

        $studentMark->update(['is_published' => ! $studentMark->is_published]);

        return response()->json([
            'data' => $studentMark,
            'message' => $studentMark->is_published ? 'Mark published.' : 'Mark unpublished.',
        ]);
    }

    public function publishAssessment(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.publish'), 403);

        $validated = $request->validate([
            'unit_id' => 'required|string|exists:units,id',
            'assessment_type' => ['required', 'string', Rule::in(self::ASSESSMENT_TYPES)],
            'assessment_number' => 'nullable|integer|min:1',
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'publish' => 'required|boolean',
        ]);

        [$assessmentType, $assessmentNumber] = $this->parseAssessmentType($validated['assessment_type']);

        $enrolmentIds = AcademicSessionEnrolment::where('academic_session_id', $validated['academic_session_id'])
            ->pluck('id');

        $query = StudentMark::whereIn('academic_session_enrolment_id', $enrolmentIds)
            ->where([
                'unit_id' => $validated['unit_id'],
                'assessment_type' => $assessmentType,
                'assessment_number' => $assessmentNumber,
            ]);

        $count = $query->update(['is_published' => $validated['publish']]);

        return response()->json([
            'message' => $validated['publish']
                ? "{$count} marks published."
                : "{$count} marks unpublished.",
            'updated_count' => $count,
        ]);
    }

    public function publishFiltered(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.publish'), 403);

        $validated = $request->validate([
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'unit_id' => 'nullable|string|exists:units,id',
            'assessment_type' => 'nullable|string|max:50',
            'student_id' => 'nullable|string|exists:students,id',
            'publish' => 'required|boolean',
        ]);

        $query = StudentMark::query();

        if ($sessionId = $validated['academic_session_id'] ?? null) {
            $query->whereHas('academicSessionEnrolment', fn ($q) => $q->where('academic_session_id', $sessionId));
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
            $query->whereHas('academicSessionEnrolment', fn ($q) => $q->where('student_id', $studentId));
        }

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
        abort_unless($request->user()?->can('assessments.view'), 403);

        $validated = $request->validate([
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
        ]);

        $units = Unit::query()
            ->whereExists(function ($q) use ($validated) {
                $q->select(DB::raw(1))
                    ->from('student_unit_registrations')
                    ->join('academic_session_enrolments', 'academic_session_enrolments.id', '=', 'student_unit_registrations.academic_session_enrolment_id')
                    ->whereColumn('student_unit_registrations.unit_id', 'units.id');
                if (($validated['academic_session_id'] ?? null)) {
                    $q->where('academic_session_enrolments.academic_session_id', $validated['academic_session_id']);
                }
            })
            ->get(['id', 'code', 'name']);

        return response()->json(['data' => $units]);
    }

    public function availableStudents(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);
        $authenticatedStudent = $this->authenticatedStudent($request);

        $validated = $request->validate([
            'academic_session_id' => 'nullable|string|exists:academic_sessions,id',
            'unit_id' => 'nullable|string|exists:units,id',
        ]);

        $query = Student::query()
            ->with('user:id,first_name,middle_name,last_name')
            ->select('students.id', 'students.user_id', 'students.admission_number')
            ->join('academic_session_enrolments', 'academic_session_enrolments.student_id', '=', 'students.id')
            ->join('student_unit_registrations', 'student_unit_registrations.academic_session_enrolment_id', '=', 'academic_session_enrolments.id')
            ->when($validated['academic_session_id'] ?? null, fn ($q) => $q->where('academic_session_enrolments.academic_session_id', $validated['academic_session_id']))
            ->when($authenticatedStudent, fn ($studentQuery, Student $student) => $studentQuery->where('students.id', $student->id));

        if ($unitId = $validated['unit_id'] ?? null) {
            $query->where('student_unit_registrations.unit_id', $unitId);
        }

        if ($q = $request->get('q')) {
            $query->where(function ($qry) use ($q) {
                $qry->where('students.admission_number', 'like', "%{$q}%")
                    ->orWhereHas('user', fn ($userQuery) => $userQuery
                        ->where('first_name', 'like', "%{$q}%")
                        ->orWhere('last_name', 'like', "%{$q}%"));
            });
        }

        $students = $query->distinct()->get()->map(fn ($s) => [
            'id' => $s->id,
            'admission_number' => $s->admission_number,
            'name' => trim(collect([$s->first_name, $s->middle_name, $s->last_name])->filter()->implode(' ')),
        ]);

        return response()->json(['data' => $students]);
    }

    public function marksheet(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);
        $authenticatedStudent = $this->authenticatedStudent($request);

        $validated = $request->validate([
            'academic_session_id' => 'required|string|exists:academic_sessions,id',
            'unit_id' => 'required|string|exists:units,id',
            'student_id' => 'nullable|string|exists:students,id',
        ]);

        if ($authenticatedStudent) {
            $validated['student_id'] = $authenticatedStudent->id;
        }

        $students = Student::query()
            ->with('user:id,first_name,middle_name,last_name')
            ->select('students.id', 'students.user_id', 'students.admission_number')
            ->join('academic_session_enrolments', 'academic_session_enrolments.student_id', '=', 'students.id')
            ->join('student_unit_registrations', 'student_unit_registrations.academic_session_enrolment_id', '=', 'academic_session_enrolments.id')
            ->where('academic_session_enrolments.academic_session_id', $validated['academic_session_id'])
            ->where('student_unit_registrations.unit_id', $validated['unit_id'])
            ->distinct();

        if ($studentId = $validated['student_id'] ?? null) {
            $students->where('students.id', $studentId);
        }

        $students = $students->get();

        $enrolments = AcademicSessionEnrolment::where('academic_session_id', $validated['academic_session_id'])
            ->when(
                $validated['student_id'] ?? null,
                fn ($enrolmentQuery, string $studentId) => $enrolmentQuery->where('student_id', $studentId),
            )
            ->get(['id', 'student_id']);
        $studentEnrolments = $enrolments->groupBy('student_id')->map(fn ($group) => $group->pluck('id'));

        $marks = StudentMark::query()
            ->whereIn('academic_session_enrolment_id', $enrolments->pluck('id'))
            ->where('unit_id', $validated['unit_id'])
            ->where('is_published', true)
            ->get();

        $assessmentTypes = $marks->pluck('assessment_type')->unique()->values();
        $assessmentNumbers = $marks->pluck('assessment_number')->unique()->sort()->values();

        $marksheet = $students->map(function ($student) use ($marks, $studentEnrolments, $assessmentTypes) {
            $studentMarks = $marks->whereIn('academic_session_enrolment_id', $studentEnrolments->get($student->id, collect()));

            $types = [];
            $total = 0;
            $count = 0;

            foreach ($assessmentTypes as $type) {
                $typeMarks = $studentMarks->where('assessment_type', $type);
                if ($typeMarks->isEmpty()) {
                    continue;
                }

                $numbers = $typeMarks->mapWithKeys(fn ($m) => [
                    "{$type}_{$m->assessment_number}" => [
                        'score' => $m->score,
                        'marks' => $m->marks,
                        'is_published' => $m->is_published,
                        'id' => $m->id,
                    ],
                ]);

                $sum = $typeMarks->sum('score');
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

    public function export(
        Request $request,
        DataExportService $exportService,
        StreamingPdfWriter $pdfWriter,
    ): StreamedResponse {
        abort_unless($request->user()?->can('assessments.view'), 403);
        $authenticatedStudent = $this->authenticatedStudent($request);

        $validated = $request->validate([
            'format' => ['nullable', 'in:csv,xlsx,pdf'],
            'academic_session_id' => ['required', 'string', 'exists:academic_sessions,id'],
            'unit_id' => ['required', 'string', 'exists:units,id'],
            'assessment_type' => ['nullable', 'string', Rule::in(self::ASSESSMENT_TYPES)],
            'student_id' => ['nullable', 'string', 'exists:students,id'],
        ]);

        if ($authenticatedStudent) {
            $validated['student_id'] = $authenticatedStudent->id;
        }

        $rowNumber = 0;

        if ($assessmentLabel = $validated['assessment_type'] ?? null) {
            [$assessmentType, $assessmentNumber] = $this->parseAssessmentType($assessmentLabel);
            $query = StudentMark::query()
                ->with('academicSessionEnrolment.student.user:id,first_name,middle_name,last_name')
                ->where('unit_id', $validated['unit_id'])
                ->where('assessment_type', $assessmentType)
                ->where('assessment_number', $assessmentNumber)
                ->when($authenticatedStudent, fn ($markQuery) => $markQuery->where('is_published', true))
                ->whereHas('academicSessionEnrolment', function ($query) use ($validated) {
                    $query->where('academic_session_id', $validated['academic_session_id'])
                        ->when(
                            $validated['student_id'] ?? null,
                            fn ($studentQuery, string $studentId) => $studentQuery->where('student_id', $studentId),
                        );
                })
                ->orderBy('academic_session_enrolment_id')
                ->orderBy('id');

            $columns = [
                ['key' => '#', 'value' => function () use (&$rowNumber) {
                    return ++$rowNumber;
                }],
                ['key' => 'Admission number', 'value' => fn (StudentMark $mark) => $mark->academicSessionEnrolment?->student?->admission_number ?? ''],
                ['key' => 'Student', 'value' => fn (StudentMark $mark) => $mark->academicSessionEnrolment?->student?->full_name ?? ''],
                ['key' => 'Assessment', 'value' => fn () => $assessmentLabel],
                ['key' => 'Score', 'value' => fn (StudentMark $mark) => $mark->score],
                ['key' => 'Status', 'value' => fn (StudentMark $mark) => $mark->is_published ? 'Published' : 'Draft'],
            ];
        } else {
            $query = AcademicSessionEnrolment::query()
                ->with([
                    'student.user:id,first_name,middle_name,last_name',
                    'studentMarks' => fn ($marksQuery) => $marksQuery
                        ->where('unit_id', $validated['unit_id'])
                        ->where('is_published', true)
                        ->orderBy('assessment_type')
                        ->orderBy('assessment_number'),
                ])
                ->where('academic_session_id', $validated['academic_session_id'])
                ->whereHas('unitRegistrations', fn ($registrationQuery) => $registrationQuery->where('unit_id', $validated['unit_id']))
                ->when(
                    $validated['student_id'] ?? null,
                    fn ($studentQuery, string $studentId) => $studentQuery->where('student_id', $studentId),
                )
                ->orderBy('student_id')
                ->orderBy('id');

            $columns = [
                ['key' => '#', 'value' => function () use (&$rowNumber) {
                    return ++$rowNumber;
                }],
                ['key' => 'Admission number', 'value' => fn (AcademicSessionEnrolment $enrolment) => $enrolment->student?->admission_number ?? ''],
                ['key' => 'Student', 'value' => fn (AcademicSessionEnrolment $enrolment) => $enrolment->student?->full_name ?? ''],
                ['key' => 'CAT 1', 'value' => fn (AcademicSessionEnrolment $enrolment) => $this->exportMark($enrolment, 'CAT', 1)],
                ['key' => 'CAT 2', 'value' => fn (AcademicSessionEnrolment $enrolment) => $this->exportMark($enrolment, 'CAT', 2)],
                ['key' => 'CAT 3', 'value' => fn (AcademicSessionEnrolment $enrolment) => $this->exportMark($enrolment, 'CAT', 3)],
                ['key' => 'AVG(CAT)', 'value' => fn (AcademicSessionEnrolment $enrolment) => $this->exportAverage($enrolment, 'CAT')],
                ['key' => 'PRAC 1', 'value' => fn (AcademicSessionEnrolment $enrolment) => $this->exportMark($enrolment, 'PRAC', 1)],
                ['key' => 'PRAC 2', 'value' => fn (AcademicSessionEnrolment $enrolment) => $this->exportMark($enrolment, 'PRAC', 2)],
                ['key' => 'PRAC 3', 'value' => fn (AcademicSessionEnrolment $enrolment) => $this->exportMark($enrolment, 'PRAC', 3)],
                ['key' => 'AVG(PRAC)', 'value' => fn (AcademicSessionEnrolment $enrolment) => $this->exportAverage($enrolment, 'PRAC')],
            ];
        }

        return $exportService->export(
            query: $query,
            columns: $columns,
            format: $validated['format'] ?? 'csv',
            filename: 'marks',
            pdfRenderer: fn (array $headers, iterable $rows) => $pdfWriter->output($headers, $rows, 'Student Marks Export'),
            pdfTitle: 'Student Marks Export',
        );
    }

    public function myMarksheet(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $student = $request->user()?->student;

        if (! $student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $validated = $request->validate([
            'session_enrolment_id' => 'nullable|string|exists:academic_session_enrolments,id',
            'year_of_study' => 'nullable|integer|min:1',
            'module' => 'nullable|integer|min:1',
        ]);

        $sessionEnrolmentId = $validated['session_enrolment_id'] ?? null;
        $selectedModule = $validated['module'] ?? null;

        if ($sessionEnrolmentId) {
            $enrolmentIds = [$sessionEnrolmentId];
            $targetEnrolment = AcademicSessionEnrolment::find($sessionEnrolmentId);
        } else {
            $selectedYear = $validated['year_of_study'] ?? null;
            if (!$selectedYear) {
                return response()->json([
                    'data' => [
                        'student' => ['id' => $student->id, 'admission_number' => $student->admission_number, 'name' => $student->full_name],
                        'marksheet' => [],
                    ],
                ]);
            }
            $enrolmentIds = AcademicSessionEnrolment::query()
                ->where('student_id', $student->id)
                ->where('year_of_study', $selectedYear)
                ->pluck('id')
                ->toArray();
        }

        if (!$enrolmentIds) {
            return response()->json([
                'data' => [
                    'student' => ['id' => $student->id, 'admission_number' => $student->admission_number, 'name' => $student->full_name],
                    'marksheet' => [],
                ],
            ]);
        }

        $registrations = StudentUnitRegistration::query()
            ->with('unit:id,code,name,year_of_study,modules_taught,session_number')
            ->with('academicSessionEnrolment')
            ->whereIn('academic_session_enrolment_id', $enrolmentIds)
            ->whereHas('unit', fn ($q) => $q->whereNotNull('year_of_study'))
            ->when($selectedModule, function ($query) use ($selectedModule) {
                $query->whereHas('unit', function ($inner) use ($selectedModule) {
                    $inner->where(function ($sub) use ($selectedModule) {
                        $sub->where('modules_taught', $selectedModule)->orWhereNull('modules_taught');
                    });
                });
            })
            ->orderBy('unit_id')
            ->get()
            ->unique('unit_id')
            ->values();

        $marks = StudentMark::query()
            ->whereIn('academic_session_enrolment_id', $enrolmentIds)
            ->whereIn('unit_id', $registrations->pluck('unit_id'))
            ->where('is_published', true)
            ->whereNotNull('score')
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('unit_id');

        $registrations = $registrations
            ->filter(fn (StudentUnitRegistration $registration) => $marks->has($registration->unit_id))
            ->values();

        $marksheet = $registrations->map(function (StudentUnitRegistration $registration) use ($marks) {
            $unit = $registration->unit;
            $unitMarks = $marks->get($registration->unit_id, collect());

            $scores = [];
            foreach (self::ASSESSMENT_TYPES as $label) {
                [$type, $number] = $this->parseAssessmentType($label);
                $match = $unitMarks->first(fn (StudentMark $mark) => $mark->assessment_type === $type && (int) $mark->assessment_number === $number);
                $scores[$label] = $match?->score;
            }

            $catScores = collect(['CAT 1', 'CAT 2', 'CAT 3'])
                ->map(fn ($label) => $scores[$label])
                ->filter(fn ($score) => $score !== null)
                ->values();

            $pracScores = collect(['PRAC 1', 'PRAC 2', 'PRAC 3'])
                ->map(fn ($label) => $scores[$label])
                ->filter(fn ($score) => $score !== null)
                ->values();

            return [
                'unit' => [
                    'id' => $unit?->id,
                    'code' => $unit?->code,
                    'name' => $unit?->name,
                    'year_of_study' => $unit?->year_of_study,
                    'module' => $unit?->modules_taught,
                    'session_number' => $unit?->session_number,
                ],
                'scores' => $scores,
                'averages' => [
                    'CAT' => $catScores->isEmpty() ? null : round($catScores->avg(), 1),
                    'PRAC' => $pracScores->isEmpty() ? null : round($pracScores->avg(), 1),
                ],
            ];
        })->values();

        return response()->json([
            'data' => [
                'student' => [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'name' => $student->full_name,
                ],
                'session_enrolment_id' => $sessionEnrolmentId,
                'marksheet' => $marksheet,
            ],
        ]);
    }

    public function myTranscript(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $student = $request->user()?->student;

        if (! $student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $validated = $request->validate([
            'session_enrolment_id' => 'nullable|string|exists:academic_session_enrolments,id',
            'transcript_type' => 'nullable|in:progress,cumulative',
            'year_of_study' => 'nullable|integer|min:1',
            'module' => 'nullable|integer|min:1',
        ]);

        return response()->json([
            'data' => $this->buildMyTranscriptData($student, $validated),
        ]);
    }

    public function myTranscriptDownload(Request $request): Response
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $student = $request->user()?->student;

        if (! $student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $validated = $request->validate([
            'session_enrolment_id' => 'required|string|exists:academic_session_enrolments,id',
            'transcript_type' => 'nullable|in:progress,cumulative',
        ]);

        $data = $this->buildMyTranscriptData($student, $validated);
        $data['generated_at'] = now()->format('d/m/Y H:i');
        $data['transcript_reference'] = implode('-', array_filter([
            'TR',
            preg_replace('/[^A-Za-z0-9]+/', '', (string) $student->admission_number) ?: 'NA',
            'E' . substr($validated['session_enrolment_id'], 0, 8),
        ]));

        $safeAdmissionNumber = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) $student->admission_number);
        $filename = 'transcript-' . trim($safeAdmissionNumber, '-') . '.pdf';

        $pdf = Pdf::loadView('pdf.transcript', $data)
            ->setPaper('a4', 'portrait')
            ->setWarnings(false);

        return $pdf->download($filename, [
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    private function buildMyTranscriptData(Student $student, array $validated): array
    {
        $institutionData = $this->loadInstitution();
        $sessionEnrolmentId = $validated['session_enrolment_id'] ?? null;
        $transcriptType = $validated['transcript_type'] ?? 'progress';
        $selectedModule = $validated['module'] ?? null;
        $selectedYear = $validated['year_of_study'] ?? null;

        $sessionEnrolments = AcademicSessionEnrolment::query()
            ->with('academicSession:id,name,code')
            ->where('student_id', $student->id)
            ->orderBy('year_of_study')
            ->orderBy('session_number')
            ->orderBy('module')
            ->get();

        $firstSessionEnrolment = $sessionEnrolments->first();

        $targetEnrolment = null;

        if ($sessionEnrolmentId) {
            $targetEnrolment = $sessionEnrolments->firstWhere('id', $sessionEnrolmentId)
                ?? AcademicSessionEnrolment::with('academicSession:id,name,code')->find($sessionEnrolmentId);
        } elseif ($selectedYear) {
            $targetEnrolment = $sessionEnrolments->firstWhere('year_of_study', (int) $selectedYear)
                ?? $sessionEnrolments->last();
        }

        if (!$targetEnrolment) {
            $targetEnrolment = $sessionEnrolments->last();
        }

        $targetYear = $targetEnrolment?->year_of_study;

        $profileRegistration = StudentUnitRegistration::query()
            ->with(['unit.courseCurriculum.course.authority', 'unit.courseCurriculum.course.level', 'unit.courseCurriculum.course.department'])
            ->join('academic_session_enrolments', 'academic_session_enrolments.id', '=', 'student_unit_registrations.academic_session_enrolment_id')
            ->where('academic_session_enrolments.student_id', $student->id)
            ->select('student_unit_registrations.*')
            ->first();

        $course = $profileRegistration?->unit?->courseCurriculum?->course;
        $authority = $course?->authority;

        if (!$targetEnrolment) {
            return [
                'student' => ['id' => $student->id, 'admission_number' => $student->admission_number, 'name' => $student->full_name],
                'course' => [
                    'name' => $course?->name, 'code' => $course?->code,
                    'department' => $course?->department?->name, 'school' => $course?->department?->name ?: $authority?->name,
                    'certification_authority' => $authority?->name, 'certification_level' => $course?->level?->name,
                ],
                'institution_name' => $institutionData['name'] ?? null,
                'institution' => $institutionData,
                'student_meta' => [
                    'admission_year' => $firstSessionEnrolment?->enrolled_at?->format('Y'),
                    'class_name' => null, 'session_number' => null, 'year_of_study_label' => null,
                ],
                'grade_legend' => [], 'transcript' => [],
            ];
        }

        $enrolmentIds = $transcriptType === 'cumulative'
            ? $sessionEnrolments
                ->takeWhile(fn ($e) => $e->id !== $targetEnrolment->id)
                ->push($targetEnrolment)
                ->pluck('id')
                ->toArray()
            : [$targetEnrolment->id];

        $gradeBands = $authority
            ? CertificationAuthorityGrade::query()
                ->where('certification_authority_id', $authority->id)
                ->where('is_active', true)
                ->orderByDesc('grade_end')
                ->get()
            : collect();

        $registrations = StudentUnitRegistration::query()
            ->with([
                'unit:id,course_curriculum_id,code,name,year_of_study,modules_taught,session_number,taught_hours',
                'unit.courseCurriculum.course.authority',
                'unit.courseCurriculum.course.level',
                'unit.courseCurriculum.course.department',
                'academicSessionEnrolment.academicSession:id,name,code',
            ])
            ->whereIn('academic_session_enrolment_id', $enrolmentIds)
            ->whereHas('unit', fn ($q) => $q->when($targetYear, fn ($q) => $q->where('year_of_study', '<=', $targetYear)))
            ->when($selectedModule, function ($query) use ($selectedModule) {
                $query->whereHas('unit', function ($inner) use ($selectedModule) {
                    $inner->where(function ($sub) use ($selectedModule) {
                        $sub->where('modules_taught', $selectedModule)->orWhereNull('modules_taught');
                    });
                });
            })
            ->orderBy('unit_id')
            ->get()
            ->unique('unit_id')
            ->values();

        $marks = StudentMark::query()
            ->whereIn('academic_session_enrolment_id', $enrolmentIds)
            ->whereIn('unit_id', $registrations->pluck('unit_id'))
            ->where('is_published', true)
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('unit_id');

        $registrations = $registrations
            ->filter(fn (StudentUnitRegistration $registration) => $marks->has($registration->unit_id))
            ->values();

        $transcript = $registrations->map(function (StudentUnitRegistration $registration) use ($marks, $gradeBands) {
            $unit = $registration->unit;
            $unitMarks = $marks->get($registration->unit_id, collect());

            $scores = [];
            foreach (self::ASSESSMENT_TYPES as $label) {
                [$type, $number] = $this->parseAssessmentType($label);
                $match = $unitMarks->first(fn (StudentMark $mark) => $mark->assessment_type === $type && (int) $mark->assessment_number === $number);
                $scores[$label] = $match?->score;
            }

            $allScores = collect($scores)
                ->filter(fn ($score) => $score !== null)
                ->values();

            $marksValue = $allScores->isEmpty() ? null : round($allScores->avg(), 1);
            $gradeBand = $marksValue === null
                ? null
                : $gradeBands->first(fn (CertificationAuthorityGrade $grade) => $marksValue >= (float) $grade->grade_start && $marksValue <= (float) $grade->grade_end);

            return [
                'unit' => [
                    'id' => $unit?->id,
                    'code' => $unit?->code,
                    'name' => $unit?->name,
                    'year_of_study' => $unit?->year_of_study,
                    'module' => $unit?->modules_taught,
                    'session_number' => $unit?->session_number,
                    'taught_hours' => $unit?->taught_hours,
                ],
                'academic_session' => [
                    'id' => $registration->academicSessionEnrolment?->academicSession?->id,
                    'name' => $registration->academicSessionEnrolment?->academicSession?->name,
                    'code' => $registration->academicSessionEnrolment?->academicSession?->code,
                ],
                'scores' => $scores,
                'marks' => $marksValue,
                'grade' => $gradeBand?->grade,
                'remark' => $gradeBand?->remark,
            ];
        })->values();

        return [
            'student' => [
                'id' => $student->id,
                'admission_number' => $student->admission_number,
                'name' => $student->full_name,
            ],
            'course' => [
                'name' => $course?->name,
                'code' => $course?->code,
                'department' => $course?->department?->name,
                'school' => $course?->department?->name ?: $authority?->name,
                'certification_authority' => $authority?->name,
                'certification_level' => $course?->level?->name,
            ],
            'institution_name' => $institutionData['name'] ?? null,
            'institution' => $institutionData,
            'student_meta' => [
                'admission_year' => $firstSessionEnrolment?->enrolled_at?->format('Y'),
                'class_name' => $targetEnrolment->academicSession?->name,
                'session_number' => $targetEnrolment->session_number,
                'year_of_study_label' => 'YEAR ' . $targetYear,
                'transcript_type' => $transcriptType,
                'session_enrolment_id' => $targetEnrolment->id,
            ],
            'grade_legend' => $gradeBands->map(fn (CertificationAuthorityGrade $grade) => [
                'grade' => $grade->grade,
                'points' => rtrim(rtrim(number_format((float) $grade->grade_start, 3, '.', ''), '0'), '.') . '-' . rtrim(rtrim(number_format((float) $grade->grade_end, 3, '.', ''), '0'), '.'),
                'remark' => $grade->remark,
            ])->values(),
            'transcript' => $transcript,
        ];
    }

    public function myResults(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $user = $request->user();
        $student = $user->student;

        if (! $student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $sessionEnrolment = AcademicSessionEnrolment::query()
            ->where('student_id', $student->id)
            ->latest()
            ->first();

        if (! $sessionEnrolment) {
            return response()->json(['data' => []]);
        }

        $unitRegistrations = StudentUnitRegistration::query()
            ->where('academic_session_enrolment_id', $sessionEnrolment->id)
            ->with('unit:id,code,name')
            ->get();

        $allMarks = StudentMark::query()
            ->where('academic_session_enrolment_id', $sessionEnrolment->id)
            ->where('is_published', true)
            ->get()
            ->groupBy('unit_id');

        $results = $unitRegistrations->map(function ($reg) use ($allMarks) {
            $marks = $allMarks->get($reg->unit_id, collect());

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

        return response()->json(['data' => $results]);
    }

    private function parseAssessmentType(string $label): array
    {
        [$type, $number] = explode(' ', $label, 2);

        return [$type, (int) $number];
    }

    private function exportMark(AcademicSessionEnrolment $enrolment, string $type, int $number): int|string
    {
        return $enrolment->studentMarks
            ->first(fn (StudentMark $mark) => $mark->assessment_type === $type && $mark->assessment_number === $number)
            ?->score ?? '-';
    }

    private function exportAverage(AcademicSessionEnrolment $enrolment, string $type): string
    {
        $marks = $enrolment->studentMarks->where('assessment_type', $type);

        return $marks->isEmpty() ? '-' : number_format((float) $marks->avg('score'), 1, '.', '');
    }

    private function resolveUnitRegistration(string $sessionId, string $studentId, string $unitId): StudentUnitRegistration
    {
        $enrolment = AcademicSessionEnrolment::where('student_id', $studentId)
            ->where('academic_session_id', $sessionId)
            ->firstOrFail();

        $registration = StudentUnitRegistration::query()
            ->where('academic_session_enrolment_id', $enrolment->id)
            ->where('unit_id', $unitId)
            ->first();

        abort_unless($registration, 422, 'This student is not enrolled for the selected unit in the selected academic session.');

        return $registration;
    }

    private function authenticatedStudent(Request $request): ?Student
    {
        $user = $request->user();

        if (! $user || ($user->role !== 'student' && ! $user->hasRole('student'))) {
            return null;
        }

        $student = $user->student;
        abort_unless($student, 403, 'Student profile not found.');

        return $student;
    }

    public function assessmentTypes(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        return response()->json([
            'data' => self::ASSESSMENT_TYPES,
        ]);
    }

    public function listSessionsWithMarks(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $user = $request->user();
        $student = $user->student;

        if (! $student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $enrolmentIds = StudentMark::query()
            ->where('is_published', true)
            ->whereHas('academicSessionEnrolment', fn ($q) => $q->where('student_id', $student->id))
            ->distinct()
            ->pluck('academic_session_enrolment_id');

        $sessionIds = AcademicSessionEnrolment::whereIn('id', $enrolmentIds)
            ->pluck('academic_session_id');

        $sessions = AcademicSession::whereIn('id', $sessionIds)
            ->get(['id', 'name', 'code']);

        return response()->json(['data' => $sessions]);
    }

    public function sessionEnrolments(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $student = $request->user()?->student;

        if (! $student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        $enrolments = AcademicSessionEnrolment::query()
            ->with('academicSession:id,name,code')
            ->where('student_id', $student->id)
            ->orderBy('year_of_study')
            ->orderBy('session_number')
            ->orderBy('module')
            ->get();

        $enrolmentIdsWithMarks = StudentMark::query()
            ->whereIn('academic_session_enrolment_id', $enrolments->pluck('id'))
            ->where('is_published', true)
            ->distinct()
            ->pluck('academic_session_enrolment_id')
            ->toArray();

        $data = $enrolments->map(fn (AcademicSessionEnrolment $enrolment) => [
            'id' => $enrolment->id,
            'year_of_study' => $enrolment->year_of_study,
            'session_number' => $enrolment->session_number,
            'module' => $enrolment->module,
            'academic_session_id' => $enrolment->academic_session_id,
            'academic_session_name' => $enrolment->academicSession?->name,
            'academic_session_code' => $enrolment->academicSession?->code,
            'label' => 'Year ' . $enrolment->year_of_study
                . ' Session ' . $enrolment->session_number
                . ($enrolment->module ? ' Module ' . $enrolment->module : '')
                . ' - ' . ($enrolment->academicSession?->name ?? ''),
            'has_published_marks' => in_array($enrolment->id, $enrolmentIdsWithMarks, true),
        ]);

        return response()->json(['data' => $data]);
    }

    public function adminMarksheet(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $validated = $request->validate([
            'student_id' => 'required|string|exists:students,id',
            'session_enrolment_id' => 'nullable|string|exists:academic_session_enrolments,id',
            'module' => 'nullable|integer|min:1',
        ]);

        $student = Student::find($validated['student_id']);

        if (!$student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        $sessionEnrolmentId = $validated['session_enrolment_id'] ?? null;
        $selectedModule = $validated['module'] ?? null;

        if ($sessionEnrolmentId) {
            $enrolmentIds = [$sessionEnrolmentId];
        } else {
            $enrolmentIds = AcademicSessionEnrolment::query()
                ->where('student_id', $student->id)
                ->pluck('id')
                ->toArray();
        }

        if (!$enrolmentIds) {
            return response()->json([
                'data' => [
                    'student' => ['id' => $student->id, 'admission_number' => $student->admission_number, 'name' => $student->full_name],
                    'marksheet' => [],
                ],
            ]);
        }

        $registrations = StudentUnitRegistration::query()
            ->with('unit:id,code,name,year_of_study,modules_taught,session_number')
            ->with('academicSessionEnrolment.academicSession:id,name,code')
            ->whereIn('academic_session_enrolment_id', $enrolmentIds)
            ->whereHas('unit', fn ($q) => $q->whereNotNull('year_of_study'))
            ->when($selectedModule, function ($query) use ($selectedModule) {
                $query->whereHas('unit', function ($inner) use ($selectedModule) {
                    $inner->where(function ($sub) use ($selectedModule) {
                        $sub->where('modules_taught', $selectedModule)->orWhereNull('modules_taught');
                    });
                });
            })
            ->orderBy('unit_id')
            ->get()
            ->values();

        $registrationUnitIds = $registrations->pluck('unit_id');
        $registrationEnrolmentIds = $registrations->pluck('academic_session_enrolment_id');

        $marks = StudentMark::query()
            ->whereIn('academic_session_enrolment_id', $registrationEnrolmentIds)
            ->whereIn('unit_id', $registrationUnitIds)
            ->where('is_published', true)
            ->whereNotNull('score')
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy(fn ($mark) => $mark->unit_id . '-' . $mark->academic_session_enrolment_id);

        $marksheet = $registrations->map(function (StudentUnitRegistration $registration) use ($marks) {
            $unit = $registration->unit;
            $groupKey = $unit->id . '-' . $registration->academic_session_enrolment_id;
            $unitMarks = $marks->get($groupKey, collect());

            if ($unitMarks->isEmpty()) return null;

            $enrolment = $registration->academicSessionEnrolment;

            $scores = [];
            foreach (self::ASSESSMENT_TYPES as $label) {
                [$type, $number] = $this->parseAssessmentType($label);
                $match = $unitMarks->first(fn (StudentMark $mark) => $mark->assessment_type === $type && (int) $mark->assessment_number === $number);
                $scores[$label] = $match?->score;
            }

            $catScores = collect(['CAT 1', 'CAT 2', 'CAT 3'])
                ->map(fn ($label) => $scores[$label])
                ->filter(fn ($score) => $score !== null)
                ->values();

            $pracScores = collect(['PRAC 1', 'PRAC 2', 'PRAC 3'])
                ->map(fn ($label) => $scores[$label])
                ->filter(fn ($score) => $score !== null)
                ->values();

            return [
                'session_enrolment_id' => $registration->academic_session_enrolment_id,
                'session_label' => 'Year ' . $enrolment?->year_of_study
                    . ' Session ' . $enrolment?->session_number
                    . ($enrolment?->module ? ' Module ' . $enrolment->module : '')
                    . ' - ' . ($enrolment?->academicSession?->name ?? ''),
                'unit' => [
                    'id' => $unit?->id,
                    'code' => $unit?->code,
                    'name' => $unit?->name,
                    'year_of_study' => $unit?->year_of_study,
                    'module' => $unit?->modules_taught,
                    'session_number' => $unit?->session_number,
                ],
                'scores' => $scores,
                'averages' => [
                    'CAT' => $catScores->isEmpty() ? null : round($catScores->avg(), 1),
                    'PRAC' => $pracScores->isEmpty() ? null : round($pracScores->avg(), 1),
                ],
            ];
        })->filter()->values();

        return response()->json([
            'data' => [
                'student' => [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'name' => $student->full_name,
                ],
                'marksheet' => $marksheet,
            ],
        ]);
    }

    public function adminStudentEnrolments(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $validated = $request->validate([
            'student_id' => 'required|string|exists:students,id',
        ]);

        $enrolments = AcademicSessionEnrolment::query()
            ->with('academicSession:id,name,code')
            ->where('student_id', $validated['student_id'])
            ->orderBy('year_of_study')
            ->orderBy('session_number')
            ->orderBy('module')
            ->get();

        $enrolmentIdsWithMarks = StudentMark::query()
            ->whereIn('academic_session_enrolment_id', $enrolments->pluck('id'))
            ->where('is_published', true)
            ->distinct()
            ->pluck('academic_session_enrolment_id')
            ->toArray();

        $data = $enrolments->map(fn (AcademicSessionEnrolment $enrolment) => [
            'id' => $enrolment->id,
            'year_of_study' => $enrolment->year_of_study,
            'session_number' => $enrolment->session_number,
            'module' => $enrolment->module,
            'academic_session_id' => $enrolment->academic_session_id,
            'academic_session_name' => $enrolment->academicSession?->name,
            'academic_session_code' => $enrolment->academicSession?->code,
            'label' => 'Year ' . $enrolment->year_of_study
                . ' Session ' . $enrolment->session_number
                . ($enrolment->module ? ' Module ' . $enrolment->module : '')
                . ' - ' . ($enrolment->academicSession?->name ?? ''),
            'has_published_marks' => in_array($enrolment->id, $enrolmentIdsWithMarks, true),
        ]);

        return response()->json(['data' => $data]);
    }

    public function adminTranscript(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $validated = $request->validate([
            'student_id' => 'required|string|exists:students,id',
            'session_enrolment_id' => 'nullable|string|exists:academic_session_enrolments,id',
            'transcript_type' => 'nullable|in:progress,cumulative',
            'module' => 'nullable|integer|min:1',
        ]);

        $student = Student::find($validated['student_id']);

        if (!$student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        return response()->json([
            'data' => $this->buildMyTranscriptData($student, $validated),
        ]);
    }

    public function adminTranscriptDownload(Request $request): Response
    {
        abort_unless($request->user()?->can('assessments.view'), 403);

        $validated = $request->validate([
            'student_id' => 'required|string|exists:students,id',
            'session_enrolment_id' => 'required|string|exists:academic_session_enrolments,id',
            'transcript_type' => 'nullable|in:progress,cumulative',
        ]);

        $student = Student::find($validated['student_id']);

        if (!$student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        $data = $this->buildMyTranscriptData($student, $validated);
        $data['generated_at'] = now()->format('d/m/Y H:i');
        $data['transcript_reference'] = implode('-', array_filter([
            'TR',
            preg_replace('/[^A-Za-z0-9]+/', '', (string) $student->admission_number) ?: 'NA',
            'E' . substr($validated['session_enrolment_id'], 0, 8),
        ]));

        $safeAdmissionNumber = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) $student->admission_number);
        $filename = 'transcript-' . trim($safeAdmissionNumber, '-') . '.pdf';

        $pdf = Pdf::loadView('pdf.transcript', $data)
            ->setPaper('a4', 'portrait')
            ->setWarnings(false);

        return $pdf->download($filename, [
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }
}
