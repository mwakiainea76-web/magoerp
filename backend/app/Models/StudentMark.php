<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentMark extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'academic_session_id',
        'academic_session_enrolment_id',
        'student_id',
        'unit_id',
        'assessment_type',
        'assessment_number',
        'score',
        'marks',
        'is_published',
        'recorded_by_staff_id',
    ];

    protected $casts = [
        'assessment_number' => 'integer',
        'score' => 'integer',
        'marks' => 'integer',
        'is_published' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function academicSessionEnrolment(): BelongsTo
    {
        return $this->belongsTo(AcademicSessionEnrolment::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(staffs::class, 'recorded_by_staff_id');
    }
}
