<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentStatusLog extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'student_id',
        'course_enrolment_id',
        'from_status',
        'to_status',
        'reason',
        'effective_date',
        'recorded_by',
    ];

    protected $casts = [
        'effective_date' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function courseEnrolment(): BelongsTo
    {
        return $this->belongsTo(CourseEnrolment::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
