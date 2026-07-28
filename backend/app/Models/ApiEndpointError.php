<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ApiEndpointError extends Model
{
    use HasUuids;

    protected $fillable = [
        'method',
        'path',
        'error_count',
        'last_error_message',
        'last_context',
        'last_ip',
        'status',
        'escalated_by',
        'escalated_at',
        'escalation_note',
        'first_occurred_at',
        'last_occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'last_context' => 'array',
            'escalated_at' => 'datetime',
            'first_occurred_at' => 'datetime',
            'last_occurred_at' => 'datetime',
        ];
    }
}
