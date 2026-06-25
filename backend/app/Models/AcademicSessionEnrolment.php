<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Student;

class AcademicSessionEnrolment extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'academic_session_enrolments';

    protected $fillable = [
        'student_id',
        'academic_session_id',
        'course_enrolment_id',
        'year_of_study',
        'session_number',
        'module',
        'status',
        'enrolled_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'year_of_study' => 'integer',
        'session_number' => 'integer',
        'module' => 'integer',
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

    public static function currentProgress(Student $student): array
    {
        $total = static::where('student_id', $student->id)->count();
        $last = static::where('student_id', $student->id)->latest()->first();
        return [
            'total_sessions' => $total,
            'current_year' => $last?->year_of_study ?? 0,
            'current_module' => $last?->session_number ?? 0,
            'current_module_number' => $last?->module ?? 0,
            'modules_per_year' => 3,
        ];
    }
}
