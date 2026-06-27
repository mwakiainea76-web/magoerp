<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'initials',
        'name',
        'duration_months',
        'description',
        'is_active',
        'certification_authority_id',
        'certification_level_id',
        'department_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'duration_months' => 'integer',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function authority(): BelongsTo
    {
        return $this->belongsTo(CertificationAuthority::class, 'certification_authority_id');
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(CertificationLevel::class, 'certification_level_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Departments::class, 'department_id');
    }

    public function curricula(): BelongsToMany
    {
        return $this->belongsToMany(Curriculum::class, 'course_curricula')
            ->withPivot('id', 'is_active', 'created_at', 'updated_at')
            ->withTimestamps();
    }

    public function courseCurricula(): HasMany
    {
        return $this->hasMany(CourseCurriculum::class, 'course_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function getDurationLabelAttribute(): string
    {
        if (!$this->duration_months) {
            return 'N/A';
        }
        $years = intdiv($this->duration_months, 12);
        $months = $this->duration_months % 12;
        $parts = [];
        if ($years) {
            $parts[] = $years . ' ' . ($years === 1 ? 'year' : 'years');
        }
        if ($months) {
            $parts[] = $months . ' ' . ($months === 1 ? 'month' : 'months');
        }
        return implode(' ', $parts) ?: 'N/A';
    }

    public function getDurationYearsAttribute(): int
    {
        return $this->duration_months ? intdiv($this->duration_months, 12) : 0;
    }
}
