<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CurriculumFeeAssignment extends Model
{
    use HasUuids;

    protected $table = 'curriculum_fee_assignments';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'course_curriculum_id',
        'fee_template_id',
        'academic_session_id',
        'year_level',
        'session_number',
        'is_approved',
        'approved_by',
        'approved_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_approved' => 'boolean',
            'approved_at' => 'datetime',
        ];
    }

    public function courseCurriculum(): BelongsTo
    {
        return $this->belongsTo(CourseCurriculum::class);
    }

    public function feeTemplate(): BelongsTo
    {
        return $this->belongsTo(FeeTemplate::class, 'fee_template_id');
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
