<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasFactory;

    protected $table = 'attendances';

    protected $fillable = [
        'academic_timetable_id',
        'student_id',
        'academic_session_id',
        'attendance_date',
        'status',
        'remarks',
        'marked_by',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'status' => 'string',
    ];

    public function academicTimetable(): BelongsTo
    {
        return $this->belongsTo(AcademicTimetable::class, 'academic_timetable_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class, 'academic_session_id');
    }

    public function markedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by');
    }
}