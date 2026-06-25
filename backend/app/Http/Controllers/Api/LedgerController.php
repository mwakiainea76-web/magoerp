<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LedgerTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LedgerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $studentId = (string) $request->string('student_id', '');

        $transactions = LedgerTransaction::query()
            ->with(['student', 'invoice', 'academicSession'])
            ->when($studentId !== '', fn ($q) => $q->where('student_id', $studentId))
            ->latest('transaction_date')
            ->paginate(50)
            ->withQueryString();

        return response()->json([
            'data' => $transactions->getCollection()->map(fn (LedgerTransaction $t) => [
                'id' => $t->id,
                'student_id' => $t->student_id,
                'student_name' => $this->studentName($t->student),
                'admission_number' => $t->student?->admission_number,
                'invoice_number' => $t->invoice?->invoice_number,
                'session_name' => $t->academicSession?->name,
                'type' => $t->type,
                'debit' => (float) $t->debit,
                'credit' => (float) $t->credit,
                'net' => (float) $t->net_amount,
                'reference' => $t->reference,
                'description' => $t->description,
                'transaction_date' => $t->transaction_date?->format('Y-m-d'),
            ])->values(),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function myLedger(Request $request): JsonResponse
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['data' => []]);
        }

        $transactions = LedgerTransaction::query()
            ->where('student_id', $student->id)
            ->with(['invoice', 'academicSession'])
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get()
            ->map(fn (LedgerTransaction $t) => [
                'id' => $t->id,
                'invoice_number' => $t->invoice?->invoice_number,
                'session_name' => $t->academicSession?->name,
                'type' => $t->type,
                'debit' => (float) $t->debit,
                'credit' => (float) $t->credit,
                'net' => (float) $t->net_amount,
                'reference' => $t->reference,
                'description' => $t->description,
                'transaction_date' => $t->transaction_date?->format('Y-m-d'),
            ])
            ->values();

        return response()->json(['data' => $transactions]);
    }

    private function studentName($student): string
    {
        if (!$student) return '—';
        return trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' '));
    }
}
