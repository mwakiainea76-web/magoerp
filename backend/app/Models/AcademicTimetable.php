<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AcademicTimetable extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'academic_timetables';

    protected $fillable = [
        'academic_session_id',
        'unit_id',
        'trainer_staff_id',
        'lecture_room_id',
        'day_of_week',
        'start_time',
        'end_time',
        'type',
        'recurrence',
        'date',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'start_time' => 'string',
        'end_time' => 'string',
        'date' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function trainer(): BelongsTo
    {
        return $this->belongsTo(staffs::class, 'trainer_staff_id');
    }

    public function lectureRoom(): BelongsTo
    {
        return $this->belongsTo(LectureRoom::class, 'lecture_room_id');
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
