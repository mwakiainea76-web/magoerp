<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'academic_session_id' => $this->academic_session_id,
            'total_invoiced' => (float) $this->total_invoiced,
            'total_paid' => (float) $this->total_paid,
            'balance' => (float) $this->balance,
            'is_overdue' => $this->is_overdue,
            'last_transaction_at' => $this->last_transaction_at?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
