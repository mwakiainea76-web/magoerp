<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\LedgerTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LedgerController extends Controller
{
    use PaginationMeta;

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('finance.view'), 403);

        $studentId = (string) $request->string('student_id', '');

        $transactions = LedgerTransaction::query()
            ->with(['student', 'invoice', 'academicSession'])
            ->when($studentId !== '', fn ($q) => $q->where('student_id', $studentId))
            ->latest('transaction_date')
            ->paginate(50)
            ->withQueryString();

        return response()->json([
            'status_code' => 200,
            'data' => $transactions->getCollection()->map(fn (LedgerTransaction $t) => $this->transform($t, true))->values(),
            'meta' => $this->paginationMeta($transactions, [
                'student_id' => $studentId,
            ]),
        ], 200);
    }

    public function myLedger(Request $request): JsonResponse
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['status_code' => 200, 'data' => []], 200);
        }

        $transactions = LedgerTransaction::query()
            ->where('student_id', $student->id)
            ->with(['invoice', 'academicSession'])
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get()
            ->map(fn (LedgerTransaction $t) => $this->transform($t))
            ->values();

        return response()->json(['status_code' => 200, 'data' => $transactions], 200);
    }

    private function transform(LedgerTransaction $transaction, bool $includeStudent = false): array
    {
        $data = [
            'id' => $transaction->id,
            'invoice_number' => $transaction->invoice?->invoice_number,
            'session_name' => $transaction->academicSession?->name,
            'type' => $transaction->type,
            'debit' => (float) $transaction->debit,
            'credit' => (float) $transaction->credit,
            'net' => (float) $transaction->net_amount,
            'reference' => $transaction->reference,
            'description' => $transaction->description,
            'transaction_date' => $transaction->transaction_date?->format('Y-m-d'),
        ];

        if ($includeStudent) {
            $data = [
                'student_id' => $transaction->student_id,
                'student_name' => $this->studentName($transaction->student),
                'admission_number' => $transaction->student?->admission_number,
            ] + $data;
        }

        return $data;
    }

    private function studentName($student): string
    {
        if (!$student) return '-';
        return trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' '));
    }
}
