<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\StudentLedgerEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentLedgerController extends Controller
{
    use PaginationMeta;

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $studentId = (string) $request->string('student_id', '');
        $academicSessionId = (string) $request->string('academic_session_id', '');
        $perPage = max(1, min((int) $request->integer('per_page', 50), 200));

        $entries = StudentLedgerEntry::query()
            ->with(['student.user', 'invoice', 'academicSession', 'payment'])
            ->when($studentId !== '', fn ($q) => $q->where('student_id', $studentId))
            ->when($academicSessionId !== '', fn ($q) => $q->where('academic_session_id', $academicSessionId))
            ->latest('transaction_date')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'status_code' => 200,
            'data' => $entries->getCollection()->map(fn (StudentLedgerEntry $t) => $this->transform($t, true))->values(),
            'meta' => $this->paginationMeta($entries, [
                'student_id' => $studentId,
                'academic_session_id' => $academicSessionId,
            ]),
        ], 200);
    }

    public function myLedger(Request $request): JsonResponse
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['status_code' => 200, 'data' => []], 200);
        }

        $entries = StudentLedgerEntry::query()
            ->where('student_id', $student->id)
            ->with(['invoice', 'academicSession', 'payment'])
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get()
            ->map(fn (StudentLedgerEntry $t) => $this->transform($t))
            ->values();

        return response()->json(['status_code' => 200, 'data' => $entries], 200);
    }

    private function transform(StudentLedgerEntry $entry, bool $includeStudent = false): array
    {
        $data = [
            'id' => $entry->id,
            'payment_id' => $entry->payment_id,
            'payment_ref' => $entry->payment?->reference,
            'invoice_number' => $entry->invoice?->invoice_number,
            'session_name' => $entry->academicSession?->name,
            'type' => $entry->type,
            'debit' => (float) $entry->debit,
            'credit' => (float) $entry->credit,
            'net' => (float) $entry->net_amount,
            'reference' => $entry->reference,
            'description' => $entry->description,
            'transaction_date' => $entry->transaction_date?->format('Y-m-d'),
        ];

        if ($includeStudent) {
            $data = [
                'student_id' => $entry->student_id,
                'student_name' => $this->studentName($entry->student),
                'admission_number' => $entry->student?->admission_number,
            ] + $data;
        }

        return $data;
    }

    private function studentName($student): string
    {
        if (!$student) return '-';
        return trim(collect([$student->user->first_name, $student->user->middle_name, $student->user->last_name])->filter()->implode(' '));
    }
}
