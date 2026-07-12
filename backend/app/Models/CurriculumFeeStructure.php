<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CurriculumFeeStructure extends Model
{
    use HasUuids;

    public const ALL_YEAR_LEVELS = 0;

    protected $table = 'curriculum_fee_structures';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'course_curriculum_id',
        'department_id',
        'fee_structure_id',
        'academic_session_id',
        'issuance_type',
        'parent_assignment_id',
        'dormant',
        'split_amount',
        'split_ratio',
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
            'dormant' => 'boolean',
            'approved_at' => 'datetime',
            'split_amount' => 'float',
            'split_ratio' => 'float',
            'year_level' => 'integer',
        ];
    }

    public function courseCurriculum(): BelongsTo
    {
        return $this->belongsTo(CourseCurriculum::class);
    }

    public function feeStructure(): BelongsTo
    {
        return $this->belongsTo(FeeStructure::class, 'fee_structure_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Departments::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function parentAssignment(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_assignment_id');
    }

    public function childAssignments(): HasMany
    {
        return $this->hasMany(self::class, 'parent_assignment_id');
    }

    public function audits(): HasMany
    {
        return $this->hasMany(FeeAssignmentAudit::class, 'curriculum_fee_structure_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function scopeActive($query)
    {
        return $query->where('dormant', false);
    }

    public function scopePerSession($query)
    {
        return $query->where('issuance_type', 'per_session');
    }

    public function scopePerYear($query)
    {
        return $query->where('issuance_type', 'per_year');
    }
}
