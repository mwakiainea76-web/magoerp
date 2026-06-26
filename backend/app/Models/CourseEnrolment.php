<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CourseEnrolment extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'course_enrolments';

    protected $fillable = [
        'student_id',
        'course_id',
        'curriculum_id',
        'course_curriculum_id',
        'academic_session_id',
        'enrolment_date',
        'status',
        'remarks',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'enrolment_date' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function curriculum(): BelongsTo
    {
        return $this->belongsTo(Curriculum::class);
    }

    public function courseCurriculum(): BelongsTo
    {
        return $this->belongsTo(CourseCurriculum::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function sessionEnrolments(): HasMany
    {
        return $this->hasMany(AcademicSessionEnrolment::class);
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
