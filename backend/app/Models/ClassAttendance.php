<?php

namespace App\Models;

use App\Enums\AttendanceStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassAttendance extends Model
{
    use HasUuids;

    protected $table = 'class_attendances';

    protected $fillable = [
        'unit_id',
        'unit_enrolment_id',
        'trainer_id',
        'session_date',
        'start_time',
        'status',
        'remarks',
        'created_by',
    ];

    protected $casts = [
        'session_date' => 'date',
        'start_time' => 'string',
        'status' => AttendanceStatus::class,
    ];

    protected $keyType = 'string';
    public $incrementing = false;

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function unitEnrolment(): BelongsTo
    {
        return $this->belongsTo(StudentUnitRegistration::class, 'unit_enrolment_id');
    }

    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}