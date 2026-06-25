<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CurriculumTransfer extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'student_id',
        'from_curriculum_mapping_id',
        'to_curriculum_mapping_id',
        'transfer_date',
        'reason',
        'approved_by',
    ];

    protected $casts = [
        'transfer_date' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function fromCurriculumMapping(): BelongsTo
    {
        return $this->belongsTo(CourseCurriculum::class, 'from_curriculum_mapping_id');
    }

    public function toCurriculumMapping(): BelongsTo
    {
        return $this->belongsTo(CourseCurriculum::class, 'to_curriculum_mapping_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(staffs::class, 'approved_by');
    }
}
