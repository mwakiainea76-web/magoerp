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
        'academic_session_enrolment_id',
        'unit_id',
        'assessment_type',
        'assessment_number',
        'score',
        'marks',
        'is_published',
        'recorded_by',
    ];

    protected $casts = [
        'assessment_number' => 'integer',
        'score' => 'integer',
        'marks' => 'integer',
        'is_published' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function academicSessionEnrolment(): BelongsTo
    {
        return $this->belongsTo(AcademicSessionEnrolment::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
