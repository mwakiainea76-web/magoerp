<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademicSessionEnrolment extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'academic_session_enrolments';

    protected $fillable = [
        'student_id',
        'academic_session_id',
        'course_enrolment_id',
        'status',
        'enrolled_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function courseEnrolment(): BelongsTo
    {
        return $this->belongsTo(CourseEnrolment::class);
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
