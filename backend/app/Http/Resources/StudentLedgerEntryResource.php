<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentLedgerEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'invoice_id' => $this->invoice_id,
            'payment_id' => $this->payment_id,
            'academic_session_id' => $this->academic_session_id,
            'type' => $this->type,
            'debit' => (float) $this->debit,
            'credit' => (float) $this->credit,
            'net' => (float) $this->net_amount,
            'reference' => $this->reference,
            'description' => $this->description,
            'transaction_date' => $this->transaction_date?->format('Y-m-d'),
            'invoice_number' => $this->invoice?->invoice_number,
            'session_name' => $this->academicSession?->name,
            'payment' => $this->when($this->relationLoaded('payment') && $this->payment, [
                'id' => $this->payment->id,
                'reference' => $this->payment->reference,
                'method' => $this->payment->method,
                'amount' => (float) $this->payment->amount,
            ]),
            'student_name' => $this->student ? trim(collect([$this->student->user->first_name, $this->student->user->middle_name, $this->student->user->last_name])->filter()->implode(' ')) : null,
            'admission_number' => $this->student?->admission_number,
            'created_at' => $this->created_at,
        ];
    }
}
