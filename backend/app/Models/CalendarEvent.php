<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarEvent extends Model
{
    use HasUuids;

    protected $table = 'calendar_events';

    protected $fillable = [
        'academic_session_id',
        'event_type_id',
        'title',
        'description',
        'start_date',
        'end_date',
        'source',
        'is_locked',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_locked' => 'boolean',
        'source' => 'string',
    ];

    protected $keyType = 'string';
    public $incrementing = false;

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class, 'academic_session_id');
    }

    public function eventType(): BelongsTo
    {
        return $this->belongsTo(CalendarEventType::class, 'event_type_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}