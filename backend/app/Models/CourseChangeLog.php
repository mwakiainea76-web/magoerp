<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseChangeLog extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'student_id',
        'old_admission_number',
        'new_admission_number',
        'old_course_curriculum_id',
        'new_course_curriculum_id',
        'processed_by',
        'changed_at',
        'notes',
    ];

    public function oldCourseCurriculum(): BelongsTo
    {
        return $this->belongsTo(CourseCurriculum::class, 'old_course_curriculum_id');
    }

    public function newCourseCurriculum(): BelongsTo
    {
        return $this->belongsTo(CourseCurriculum::class, 'new_course_curriculum_id');
    }

    protected $casts = [
        'changed_at' => 'datetime',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
