<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\BalanceExpression;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\AcademicYear;
use App\Models\CourseEnrolment;
use App\Models\CurriculumFeeAssignment;
use App\Models\FeeTemplate;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\InvoicePaymentAllocation;
use App\Models\Student;
use App\Models\StudentAccountBalance;
use App\Models\StudentLedgerEntry;
use App\Services\BillingService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class InvoicesController extends Controller
{
    use BalanceExpression;
    use PaginationMeta;

    public function __construct(
        protected BillingService $billingService
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $studentId = (string) $request->string('student_id', '');
        $perPage = max(1, min((int) $request->integer('per_page', $studentId !== '' ? 50 : ($search === '' ? 6 : 10)), 200));

        $admissionNumber = trim((string) $request->string('admission_number', ''));
        $departmentId = (string) $request->string('department_id', '');
        $courseId = (string) $request->string('course_id', '');
        $academicYearId = (string) $request->string('academic_year_id', '');
        $academicSessionId = (string) $request->string('academic_session_id', '');
        $dateFrom = (string) $request->string('date_from', '');
        $dateTo = (string) $request->string('date_to', '');

        $sortableColumns = [
            'invoice_number' => 'invoice_number',
            'invoice_type' => 'invoice_type',
            'status' => 'status',
            'issue_date' => 'issue_date',
            'due_date' => 'due_date',
            'amount_due' => 'amount_due',
            'created_at' => 'created_at',
        ];

        $invoices = Invoice::query()
            ->with(['student.user', 'academicSession', 'paymentAllocations.payment'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('student', function ($sq) use ($search) {
                            $sq->where('admission_number', 'like', "%{$search}%");
                        })
                        ->orWhereHas('student.user', function ($uq) use ($search) {
                            $uq->where('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($admissionNumber !== '', fn ($q) => $q->whereHas('student', fn ($sq) => $sq->where('admission_number', 'like', "%{$admissionNumber}%")))
            ->when($departmentId !== '', fn ($q) => $q->where('department_id', $departmentId))
            ->when($courseId !== '', fn ($q) => $q->where('course_id', $courseId))
            ->when($academicSessionId !== '', fn ($q) => $q->where('academic_session_id', $academicSessionId))
            ->when($academicYearId !== '' && $academicSessionId === '', fn ($q) => $q->whereHas('academicSession', fn ($sq) => $sq->where('academic_year_id', $academicYearId)))
            ->when($dateFrom !== '', fn ($q) => $q->whereDate('issue_date', '>=', $dateFrom))
            ->when($dateTo !== '', fn ($q) => $q->whereDate('issue_date', '<=', $dateTo))
            ->when($studentId !== '', fn ($q) => $q->where('student_id', $studentId))
            ->orderBy($sortableColumns[$sortBy] ?? 'created_at', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        // FIFO credit: distribute unallocated payments to oldest invoices first
        $collection = $invoices->getCollection();
        $studentIds = $collection->pluck('student_id')->unique()->values()->toArray();

        $creditFifo = [];
        if (!empty($studentIds)) {
            $unallocatedCredit = [];
            Payment::query()
                ->whereIn('student_id', $studentIds)
                ->where('status', 'completed')
                ->chunk(100, function ($payments) use (&$unallocatedCredit) {
                    $paymentIds = $payments->pluck('id');
                    $allocatedSums = InvoicePaymentAllocation::query()
                        ->whereIn('payment_id', $paymentIds)
                        ->groupBy('payment_id')
                        ->select('payment_id', DB::raw('SUM(amount) as total'))
                        ->pluck('total', 'payment_id');

                    foreach ($payments as $p) {
                        $allocated = (float) ($allocatedSums[$p->id] ?? 0);
                        $unallocatedCredit[$p->student_id] = ($unallocatedCredit[$p->student_id] ?? 0)
                            + (float) $p->amount - $allocated;
                    }
                });

            if (!empty($unallocatedCredit)) {
                $studentInvoices = Invoice::query()
                    ->whereIn('student_id', array_keys($unallocatedCredit))
                    ->where('status', '!=', 'cancelled')
                    ->orderBy('issue_date')
                    ->orderBy('created_at')
                    ->get(['id', 'student_id', 'amount_due']);

                $grouped = $studentInvoices->groupBy('student_id');
                foreach ($grouped as $sid => $invs) {
                    $remaining = (float) ($unallocatedCredit[$sid] ?? 0);
                    foreach ($invs as $inv) {
                        $alreadyPaid = $collection->firstWhere('id', $inv->id)
                            ? (float) $collection->firstWhere('id', $inv->id)->paymentAllocations
                                ->filter(fn ($allocation) => $allocation->payment?->status === 'completed')
                                ->sum('amount')
                            : 0;
                        $balance = max(0, (float) $inv->amount_due - $alreadyPaid);
                        $alloc = min($balance, $remaining);
                        $creditFifo[$inv->id] = $alloc;
                        $remaining -= $alloc;
                        if ($remaining <= 0) break;
                    }
                }
            }
        }

        return response()->json([
            'status_code' => 200,
            'data' => $collection->map(fn (Invoice $i) => $this->transform($i, $creditFifo[$i->id] ?? 0))->values(),
            'meta' => $this->paginationMeta($invoices, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ], 200);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $invoice->load(['student.user', 'academicSession', 'items', 'paymentAllocations.payment', 'ledgerEntries']);

        return response()->json([
            'status_code' => 200,
            'data' => $this->transformFull($invoice),
        ], 200);
    }

    /**
     * Preview what would happen if an invoice is reversed.
     * Shows the amount that would be credited and affected ledger entries.
     */
    public function reversalPreview(Request $request, Invoice $invoice): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        if (!in_array($invoice->status, ['issued', 'partial'], true)) {
            return response()->json([
                'status_code' => 422,
                'message' => 'Invoice is not in a reversible state.',
            ], 422);
        }

        $allocatedPayments = (float) InvoicePaymentAllocation::where('invoice_id', $invoice->id)->sum('amount');
        $itemsTotal = (float) $invoice->items()->sum('total_amount');

        return response()->json([
            'data' => [
                'invoice' => [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'amount_due' => (float) $invoice->amount_due,
                    'status' => $invoice->status,
                ],
                'items_total' => $itemsTotal,
                'allocated_payments' => $allocatedPayments,
                'reversal_amount' => round((float) $invoice->amount_due, 2),
                'impact' => $allocatedPayments > 0
                    ? 'This invoice has KES ' . number_format($allocatedPayments, 2) . ' in payments allocated. Reversing will cancel the invoice and remove its balance from the student account.'
                    : 'No payments have been allocated to this invoice. Reversing will simply cancel it.',
            ],
        ]);
    }

    /**
     * Reverse (cancel) a wrongly issued invoice.
     */
    public function reverse(Request $request, Invoice $invoice): JsonResponse
    {
        abort_unless($request->user()?->can('finance.update'), 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $invoice = $this->billingService->reverseInvoice(
                $invoice,
                $validated['reason'],
                (string) $request->user()->id,
            );
        } catch (ValidationException $e) {
            return response()->json([
                'status_code' => 422,
                'message' => 'Failed to reverse invoice.',
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'status_code' => 200,
            'message' => 'Invoice reversed successfully.',
            'data' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'status' => $invoice->status,
            ],
        ]);
    }

    public function availableTemplates(Student $student): JsonResponse
    {
        abort_unless(request()->user()?->can('finance.view'), 403);

        $courseCurriculumId = $student->courseEnrolments()
                ->where('status', 'enrolled')
                ->latest()
                ->value('course_curriculum_id');

        if (!$courseCurriculumId) {
            return response()->json(['data' => []], 200);
        }

        $courseCurriculum = CourseCurriculum::query()->with('course:id,department_id')->find($courseCurriculumId);
        $departmentId = $courseCurriculum?->course?->department_id;

        $templates = CurriculumFeeAssignment::query()
            ->where(function ($query) use ($courseCurriculumId, $departmentId) {
                $query->where('course_curriculum_id', $courseCurriculumId);
                if ($departmentId) {
                    $query->orWhere(function ($departmentQuery) use ($departmentId) {
                        $departmentQuery->where('department_id', $departmentId)
                            ->whereNull('course_curriculum_id');
                    });
                }
            })
            ->where('is_approved', true)
            ->whereHas('feeTemplate', fn ($q) => $q->where('is_active', true))
            ->with(['feeTemplate' => function ($q) {
                $q->where('is_active', true)
                    ->with(['activeItems' => function ($q) {
                        $q->where('amount', '>', 0);
                    }]);
            }])
            ->get()
            ->filter(fn ($cit) => $cit->feeTemplate && $cit->feeTemplate->activeItems->isNotEmpty())
            ->values()
            ->map(fn ($cit) => [
                'id' => $cit->id,
                'fee_template_id' => $cit->feeTemplate->id,
                'template_code' => $cit->feeTemplate->code,
                'template_name' => $cit->feeTemplate->name,
                'year_level' => $cit->year_level,
                'session_number' => $cit->session_number,
                'total_amount' => (float) $cit->feeTemplate->activeItems->sum('amount'),
                'items' => $cit->feeTemplate->activeItems->map(fn ($i) => [
                    'id' => $i->id,
                    'name' => $i->name,
                    'amount' => (float) $i->amount,
                    'description' => $i->description,
                ])->values(),
            ]);

        return response()->json(['data' => $templates], 200);
    }

    public function creditBalance(Student $student): JsonResponse
    {
        abort_unless(request()->user()?->can('finance.view'), 403);

        $student->load('user');

        $activeSession = \App\Models\AcademicSession::query()
            ->where('is_active', true)
                ->whereHas('year', fn ($query) => $query->where('is_active', true))
            ->latest('start_date')
            ->first();

        $credit = 0;
        if ($activeSession) {
            $balance = StudentAccountBalance::query()
                ->where('student_id', $student->id)
                ->where('academic_session_id', $activeSession->id)
                ->value('balance');

            if ($balance !== null && (float) $balance < 0) {
                $credit = abs((float) $balance);
            }
        }

        return response()->json([
            'data' => [
                'credit_balance' => $credit,
                'student_id' => $student->id,
                'student_name' => $this->studentName($student),
                'admission_number' => $student->admission_number,
            ],
        ]);
    }

    public function studentStatement(Request $request, Student $student): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        return $this->statementResponse($student, $request);
    }

    public function myStatement(Request $request): JsonResponse
    {
        $student = $request->user()?->student;

        if (! $student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        return $this->statementResponse($student, $request);
    }

    private function statementResponse(Student $student, ?Request $request = null): JsonResponse
    {
        $request?->validate($this->statementRules());
        $scope = $request?->string('scope', 'session_to_date') ?? 'session_to_date';
        $academicSessionId = $request?->string('academic_session_id', '');
        $toAcademicSessionId = $request?->string('to_academic_session_id', '');
        $academicYearId = $request?->string('academic_year_id', '');

        $data = $this->prepareStatementData($student, $scope, $academicSessionId, $toAcademicSessionId, $academicYearId);

        return response()->json(['data' => $data], 200);
    }

    public function statementDownload(Request $request, Student $student): Response
    {
        $request->validate($this->statementRules());
        $user = $request->user();
        abort_unless($user?->can('finance.view') || $user?->student?->id === $student->id, 403);

        $data = $this->prepareStatementData(
            $student,
            (string) $request->string('scope', 'session_to_date'),
            (string) $request->string('academic_session_id', ''),
            (string) $request->string('to_academic_session_id', ''),
            (string) $request->string('academic_year_id', ''),
        );
        $data['generated_at'] = now()->format('d/m/Y H:i');

        $safeAdmissionNumber = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) $student->admission_number);
        $filename = 'fee-statement-' . trim($safeAdmissionNumber, '-') . '.pdf';

        $pdf = Pdf::loadView('pdf.statement', $data)
            ->setPaper('a4', 'portrait')
            ->setWarnings(false);

        return $pdf->download($filename, [
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    public function myStatementDownload(Request $request)
    {
        $student = $request->user()?->student;

        if (! $student) {
            return response()->json(['message' => 'Student profile not found.'], 404);
        }

        return $this->statementDownload($request, $student);
    }

    public function studentsNotInvoiced(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $sessionId = (string) $request->string('academic_session_id', '');
        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 50), 200));

        if ($sessionId === '') {
            return response()->json([
                'status_code' => 422,
                'message' => 'Academic session is required.',
            ], 422);
        }

        $invoicedIds = Invoice::query()
            ->where('academic_session_id', $sessionId)
            ->where('status', '!=', 'cancelled')
            ->select('student_id')
            ->distinct()
            ->pluck('student_id');

        $students = Student::query()
            ->whereHas('sessionEnrolments', function ($q) use ($sessionId) {
                $q->where('academic_session_id', $sessionId)
                  ->where('status', 'enrolled');
            })
            ->when($invoicedIds->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $invoicedIds))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('admission_number', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        });
                });
            })
            ->with([
                'user',
                'sessionEnrolments' => function ($q) use ($sessionId) {
                    $q->where('academic_session_id', $sessionId)
                      ->where('status', 'enrolled');
                },
                'activeEnrolment.courseCurriculum.course',
            ])
            ->orderBy('admission_number')
            ->paginate($perPage)
            ->withQueryString();

        $data = $students->getCollection()->map(function (Student $student) {
            $enrolment = $student->sessionEnrolments->first();
            $course = $student->activeEnrolment?->courseCurriculum?->course;

            return [
                'id' => $student->id,
                'admission_number' => $student->admission_number,
                'full_name' => $student->full_name,
                'course_name' => $course?->name,
                'course_code' => $course?->code,
                'year_of_study' => $enrolment?->year_of_study,
                'session_number' => $enrolment?->session_number,
            ];
        })->values();

        return response()->json([
            'status_code' => 200,
            'data' => $data,
            'meta' => $this->paginationMeta($students, [
                'academic_session_id' => $sessionId,
                'q' => $search,
                'per_page' => $perPage,
            ]),
        ], 200);
    }

    public function reconcile(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $validated = $request->validate([
            'student_id' => ['nullable', 'uuid', 'exists:students,id'],
            'academic_session_id' => ['nullable', 'uuid', 'exists:academic_sessions,id'],
        ]);

        $studentId = $validated['student_id'] ?? null;
        $sessionId = $validated['academic_session_id'] ?? null;

        $students = $studentId
            ? Student::query()->whereKey($studentId)->get()
            : Student::query()->get();

        $session = $sessionId ? AcademicSession::query()->find($sessionId) : null;

        $reconciledSessions = 0;
        foreach ($students as $student) {
            $targetSessions = $session
                ? collect([$session])
                : AcademicSession::query()->get();

            foreach ($targetSessions as $targetSession) {
                $this->billingService->reconcileStudentFinance($student, $targetSession);
                $reconciledSessions++;
            }
        }

        return response()->json([
            'status_code' => 200,
            'message' => 'Finance reconciliation completed.',
            'data' => [
                'student_id' => $studentId,
                'academic_session_id' => $sessionId,
                'reconciled_sessions' => $reconciledSessions,
            ],
        ], 200);
    }

    private function statementRules(): array
    {
        return [
            'scope' => ['nullable', 'in:session_to_date,per_session,per_year,custom'],
            'academic_year_id' => ['nullable', 'uuid', 'exists:academic_years,id'],
            'academic_session_id' => ['nullable', 'required_if:scope,per_session,custom', 'uuid', 'exists:academic_sessions,id'],
            'to_academic_session_id' => ['nullable', 'required_if:scope,custom', 'uuid', 'exists:academic_sessions,id'],
        ];
    }

    private function prepareStatementData(
        Student $student,
        string $scope = 'session_to_date',
        string $academicSessionId = '',
        string $toAcademicSessionId = '',
        string $academicYearId = ''
    ): array {
        $student->load('user');

        $enrolment = CourseEnrolment::query()
            ->with(['courseCurriculum.course.department', 'courseCurriculum.course.authority', 'courseCurriculum.course.level', 'courseCurriculum.curriculum', 'academicSession.year'])
            ->where('student_id', $student->id)
            ->latest()
            ->first();

        $course = $enrolment?->courseCurriculum?->course;
        $latestSessionEnrolment = AcademicSessionEnrolment::query()
            ->with('academicSession.year')
            ->where('student_id', $student->id)
            ->latest('enrolled_at')
            ->latest('created_at')
            ->first();

        // Resolve which session IDs to include based on scope
        $sessionsScope = $this->resolveStatementSessions($student, $scope, $academicSessionId, $toAcademicSessionId, $academicYearId);
        $sessionIds = $sessionsScope['session_ids'];
        $includeDormant = $sessionsScope['include_dormant'];

        // Current active session info for context
        $activeSession = AcademicSession::query()
            ->where('is_active', true)
                ->whereHas('year', fn ($query) => $query->where('is_active', true))
            ->latest('start_date')
            ->first(['id', 'name', 'code', 'academic_year_id']);

        // Build ledger transactions strictly within the requested scope.
        $runningBalance = 0.0;
        $sessionCounters = [];
        $ledgerQuery = StudentLedgerEntry::query()
            ->where('student_id', $student->id)
            ->with(['academicSession.year', 'invoice', 'payment'])
            ->orderBy('transaction_date')
            ->orderBy('created_at');
        if ($sessionIds !== []) {
            $ledgerQuery->where(function ($query) use ($sessionIds, $scope) {
                $query->whereIn('academic_session_id', $sessionIds);
                if ($scope === 'session_to_date') {
                    $query->orWhereNull('academic_session_id');
                }
            });
        }
        $transactions = $ledgerQuery->get()
            ->values()
            ->map(function (StudentLedgerEntry $entry) use (&$runningBalance, &$sessionCounters) {
                $debit = (float) $entry->debit;
                $credit = (float) $entry->credit;
                $runningBalance += $debit - $credit;
                $sessionKey = $entry->academic_session_id ?: 'other';
                $sessionCounters[$sessionKey] = ($sessionCounters[$sessionKey] ?? 0) + 1;

                return [
                    'id' => $entry->id,
                    'payment_id' => $entry->payment_id,
                    'type' => $entry->type,
                    'number' => $sessionCounters[$sessionKey],
                    'date' => $entry->transaction_date?->format('d/m/Y'),
                    'reference' => $entry->reference
                        ?? $entry->invoice?->invoice_number
                        ?? $entry->payment?->reference,
                    'description' => $entry->description ?: str($entry->type)->replace('_', ' ')->headline()->toString(),
                    'debit' => $debit,
                    'credit' => $credit,
                    'balance' => $runningBalance,
                    'academic_session_id' => $entry->academic_session_id,
                    'session_name' => $entry->academicSession?->name,
                    'academic_year' => $entry->academicSession?->year?->code,
                    'session_label' => $entry->academicSession?->name
                        ?? $entry->academicSession?->year?->code,
                    'sort_date' => $entry->transaction_date?->format('Y-m-d'),
                    'sort_order' => $entry->created_at?->format('Y-m-d H:i:s.u'),
                ];
            });

        // Recompute running balance from ledger
        $runningBalance = 0.0;
        $sessionCounters = [];
        $transactions = $transactions
            ->map(function (array $transaction) use (&$runningBalance, &$sessionCounters) {
                $sessionKey = $transaction['academic_session_id'] ?: 'other';
                $sessionCounters[$sessionKey] = ($sessionCounters[$sessionKey] ?? 0) + 1;
                $runningBalance += (float) $transaction['debit'] - (float) $transaction['credit'];
                $transaction['number'] = $sessionCounters[$sessionKey];
                $transaction['balance'] = $runningBalance;
                unset($transaction['payment_id'], $transaction['sort_date'], $transaction['sort_order']);

                return $transaction;
            });

        // Dormant portions are exposed only for explicitly requested future scopes.
        $dormantFees = collect();
        if ($includeDormant && $sessionIds !== [] && $enrolment?->course_curriculum_id) {
            $studentYearLevel = $latestSessionEnrolment?->year_of_study ?? 1;
            $departmentId = $enrolment->courseCurriculum?->course?->department_id;
            $dormantFees = CurriculumFeeAssignment::query()
                ->where(function ($query) use ($enrolment, $departmentId) {
                    $query->where('course_curriculum_id', $enrolment->course_curriculum_id);
                    if ($departmentId) {
                        $query->orWhere(function ($departmentQuery) use ($departmentId) {
                            $departmentQuery->where('department_id', $departmentId)
                                ->whereNull('course_curriculum_id');
                        });
                    }
                })
                ->whereIn('year_level', [$studentYearLevel, CurriculumFeeAssignment::ALL_YEAR_LEVELS])
                ->where('issuance_type', 'per_year')
                ->where('is_approved', true)
                ->where('dormant', true)
                ->whereIn('academic_session_id', $sessionIds)
                ->with(['academicSession:id,name,code', 'feeTemplate:id,code,name'])
                ->orderByRaw('course_curriculum_id = ? desc', [$enrolment->course_curriculum_id])
                ->orderByRaw('CASE WHEN year_level = ? THEN 0 ELSE 1 END', [$studentYearLevel])
                ->get()
                ->unique('academic_session_id')
                ->map(fn (CurriculumFeeAssignment $assignment) => [
                    'assignment_id' => $assignment->id,
                    'session_id' => $assignment->academic_session_id,
                    'session_name' => $assignment->academicSession?->name,
                    'session_code' => $assignment->academicSession?->code,
                    'template_name' => $assignment->feeTemplate?->name,
                    'amount' => (float) $assignment->split_amount,
                    'status' => 'dormant',
                ])
                ->values();
        }

        $sessionBreakdown = $transactions
            ->groupBy(fn (array $transaction) => $transaction['academic_session_id'] ?: 'other')
            ->map(function ($items) {
                $first = $items->first();
                $fees = (float) $items->sum(fn (array $transaction) => (float) $transaction['debit']);
                $paid = (float) $items->sum(fn (array $transaction) => (float) $transaction['credit']);

                return [
                    'session_name' => $first['session_label'] ?? 'Other Transactions',
                    'status' => 'posted',
                    'fees' => $fees,
                    'paid' => $paid,
                    'outstanding' => $fees - $paid,
                ];
            })
            ->values();

        $summary = [
            'total_invoiced' => (float) $sessionBreakdown->sum('fees'),
            'total_paid' => (float) $sessionBreakdown->sum('paid'),
            'outstanding_balance' => (float) $sessionBreakdown->sum('outstanding'),
            'total_debit' => (float) $transactions->sum('debit'),
            'total_credit' => (float) $transactions->sum('credit'),
            'ledger_balance' => (float) ($transactions->last()['balance'] ?? 0),
        ];

        $institutionData = $this->loadInstitution();

        return [
            'institution_name' => $institutionData['name'] ?? null,
            'institution' => $institutionData,
            'statement_mode' => [
                'scope' => $scope,
                'include_dormant' => $includeDormant,
                'session_ids' => $sessionIds,
                'active_session_id' => $activeSession?->id,
                'active_session_name' => $activeSession?->name,
            ],
            'dormant_fees' => $dormantFees,
            'student' => [
                'name' => $this->studentName($student),
                'admission_number' => $student->admission_number,
                'phone' => $student->user?->phone_number,
                'email' => $student->user?->email,
                'type' => 'Regular',
                'admission_year' => $enrolment?->enrolment_date?->format('Y'),
                'year_of_study' => $latestSessionEnrolment?->year_of_study,
                'term' => $latestSessionEnrolment?->session_number,
            ],
            'course' => $course ? [
                'name' => $course->name,
                'code' => $course->code,
                'department' => $course->department?->name,
                'school' => $course->authority?->name,
                'level' => $course->level?->name,
            ] : null,
            'session_breakdown' => $sessionBreakdown,
            'summary' => $summary,
            'transactions' => $transactions,

        ];
    }

    /**
     * Resolve which sessions to include in the statement based on scope.
     */
    private function resolveStatementSessions(
        Student $student,
        string $scope,
        string $academicSessionId,
        string $toAcademicSessionId,
        string $academicYearId
    ): array {
        $sessionIds = [];
        $includeDormant = false;

        if ($scope === 'per_session' && $academicSessionId) {
            $sessionIds = [$academicSessionId];
            $includeDormant = true;
        } elseif ($scope === 'per_year') {
            $year = $academicYearId
                ? AcademicYear::find($academicYearId)
                : AcademicYear::query()->where('is_active', true)->latest('start_date')->first();

            if ($year) {
                $sessionIds = $year->sessions()->pluck('id')->toArray();
                $includeDormant = true;
            }
        } elseif ($scope === 'custom' && $academicSessionId) {
            $fromSession = AcademicSession::find($academicSessionId);
            $toSession = $toAcademicSessionId
                ? AcademicSession::find($toAcademicSessionId)
                : $fromSession;

            if ($fromSession && $toSession) {
                if ($fromSession->academic_year_id !== $toSession->academic_year_id || $toSession->start_date->lt($fromSession->start_date)) {
                    throw ValidationException::withMessages([
                        'to_academic_session_id' => 'The session range must be chronological and remain within one academic year.',
                    ]);
                }
                $yearId = $fromSession->academic_year_id;
                $sessions = AcademicSession::query()
                    ->where('academic_year_id', $yearId)
                    ->orderBy('start_date')
                    ->orderBy('code')
                    ->get();

                $started = false;
                foreach ($sessions as $s) {
                    if ($s->id === $fromSession->id) {
                        $started = true;
                    }
                    if ($started) {
                        $sessionIds[] = $s->id;
                    }
                    if ($s->id === $toSession->id) {
                        break;
                    }
                }
                $includeDormant = true;
            }
        } else {
            // Default: session-to-date — all sessions from first to currently active
            $activeSession = AcademicSession::query()
                ->where('is_active', true)
                ->whereHas('year', fn ($query) => $query->where('is_active', true))
                ->latest('start_date')
                ->first();

            if ($activeSession) {
                $sessions = AcademicSession::query()
                    ->where('academic_year_id', $activeSession->academic_year_id)
                    ->orderBy('start_date')
                    ->orderBy('code')
                    ->get();

                foreach ($sessions as $s) {
                    $sessionIds[] = $s->id;
                    if ($s->id === $activeSession->id) {
                        break;
                    }
                }
            }
            $includeDormant = false;
        }

        return [
            'session_ids' => $sessionIds,
            'include_dormant' => $includeDormant,
        ];
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.create'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'string', 'exists:students,id'],
            'fee_template_id' => ['nullable', 'string', 'exists:fee_templates,id'],
        ]);

        $student = Student::findOrFail($validated['student_id']);

        try {
            $invoice = $this->billingService->createInvoiceForStudent(
                $student,
                $request->user()?->id,
                null,
                $validated['fee_template_id'] ?? null,
            );
        } catch (ValidationException $e) {
            return response()->json([
                'status_code' => 422,
                'message' => 'Failed to create invoice.',
                'errors' => $e->errors(),
            ], 422);
        }

        $invoice->load(['student.user', 'academicSession', 'items', 'paymentAllocations.payment', 'ledgerEntries']);

        return response()->json([
            'status_code' => 201,
            'message' => 'Invoice created successfully.',
            'data' => $this->transformFull($invoice),
        ], 201);
    }

    public function myInvoices(Request $request): JsonResponse
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['status_code' => 200, 'data' => []], 200);
        }

        $invoices = Invoice::query()
            ->where('student_id', $student->id)
            ->with(['student.user', 'academicSession', 'items', 'paymentAllocations.payment', 'ledgerEntries'])
            ->latest()
            ->get()
            ->map(fn (Invoice $i) => $this->transformFull($i))
            ->values();

        return response()->json(['status_code' => 200, 'data' => $invoices], 200);
    }

    public function financeSummary(Request $request): JsonResponse
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json([
                'status_code' => 200,
                'outstanding_balance' => 0,
                'net_balance' => 0,
                'total_paid' => 0,
                'total_adjustments' => 0,
                'unallocated_credit' => 0,
                'next_due_date' => null,
            ], 200);
        }

        $baseQuery = Invoice::query()
            ->where('student_id', $student->id)
            ->where('status', '!=', 'cancelled')
            ->select('invoices.*')
            ->selectRaw("COALESCE((SELECT SUM(invoice_payment_allocations.amount) FROM invoice_payment_allocations INNER JOIN payments ON payments.id = invoice_payment_allocations.payment_id WHERE invoice_payment_allocations.invoice_id = invoices.id AND payments.status = 'completed'), 0) as paid_amount")
            ->selectRaw("CASE WHEN ({$this->balanceExpression()}) > 0 THEN ({$this->balanceExpression()}) ELSE 0 END as balance_due");

        $invoices = $baseQuery->get();
        $outstanding = (float) $invoices->sum('balance_due');

        $payments = Payment::query()
            ->where('student_id', $student->id)
            ->where('status', 'completed')
            ->withSum('allocations', 'amount')
            ->get();
        $totalPaid = (float) $payments->sum('amount');
        $unallocatedCredit = (float) $payments->sum(
            fn (Payment $payment) => max(0, (float) $payment->amount - (float) ($payment->allocations_sum_amount ?? 0)),
        );
        $totalRefunded = Schema::hasTable('refunds')
            ? (float) \App\Models\Refund::query()
                ->where('student_id', $student->id)
                ->where('status', 'processed')
                ->sum('amount')
            : 0.0;
        $netBalance = $outstanding - $unallocatedCredit + $totalRefunded;

        $nextDueInvoice = $invoices
            ->where('balance_due', '>', 0)
            ->sortBy('due_date')
            ->first();

        return response()->json([
            'status_code' => 200,
            'outstanding_balance' => $outstanding,
            'net_balance' => $netBalance,
            'total_paid' => $totalPaid,
            'unallocated_credit' => $unallocatedCredit,
            'next_due_date' => $nextDueInvoice?->due_date?->format('Y-m-d'),
        ], 200);
    }

    public function storeCharge(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.create'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'string', 'exists:students,id'],
            'charge_type' => ['required', 'string', 'in:penalty'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $student = Student::findOrFail($validated['student_id']);

        try {
            $invoice = $this->billingService->createStandaloneChargeInvoice(
                $student,
                (float) $validated['amount'],
                $validated['charge_type'],
                $validated['description'] ?? null,
                $request->user()?->id,
            );
        } catch (ValidationException $e) {
            return response()->json([
                'status_code' => 422,
                'message' => 'Failed to create charge invoice.',
                'errors' => $e->errors(),
            ], 422);
        }

        $invoice->load(['student.user', 'academicSession', 'items']);

        return response()->json([
            'status_code' => 201,
            'message' => 'Penalty invoice created successfully.',
            'data' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'invoice_type' => $invoice->invoice_type,
                'student_id' => $invoice->student_id,
                'amount' => (float) $invoice->amount_due,
                'status' => $invoice->status,
            ],
        ], 201);
    }

    private function transform(Invoice $invoice, float $fifoCredit = 0): array
    {
        $amountDue = (float) $invoice->amount_due;
        $allocatedPayments = (float) $invoice->paymentAllocations
            ->filter(fn ($allocation) => $allocation->payment?->status === 'completed')
            ->sum('amount');
        $paidAmount = $allocatedPayments + $fifoCredit;

        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'student_id' => $invoice->student_id,
            'student_name' => $this->studentName($invoice->student),
            'admission_number' => $invoice->student?->admission_number,
            'session_name' => $invoice->academicSession?->name,
            'invoice_type' => $invoice->invoice_type,
            'status' => $invoice->status,
            'issue_date' => $invoice->issue_date?->format('Y-m-d'),
            'due_date' => $invoice->due_date?->format('Y-m-d'),
            'amount_due' => $amountDue,
            'computed_amount' => (float) $invoice->computed_amount,
            'paid_amount' => $paidAmount,
            'balance_due' => max(0, $amountDue - $paidAmount),
            'created_at' => $invoice->created_at,
        ];
    }

    private function transformFull(Invoice $invoice): array
    {
        return array_merge($this->transform($invoice), [
            'items' => $invoice->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'description' => $item->description,
                'amount' => (float) $item->amount,
                'quantity' => $item->quantity,
                'total_amount' => (float) $item->total_amount,
            ])->values()->all(),
            'invoice_payment_allocations' => $invoice->paymentAllocations->map(fn ($pa) => [
                'id' => $pa->id,
                'amount' => (float) $pa->amount,
                'payment_date' => $pa->payment?->payment_date?->format('Y-m-d'),
                'method' => $pa->payment?->method,
                'reference' => $pa->payment?->reference,
            ])->values()->all(),
        ]);
    }

    private function studentName($student): string
    {
        if (!$student) return '-';
        return trim(collect([$student->user->first_name, $student->user->middle_name, $student->user->last_name])->filter()->implode(' '));
    }
}
