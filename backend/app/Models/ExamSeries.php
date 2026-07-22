<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamSeries extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'short_name',
        'assessment_types',
        'is_active',
        'academic_session_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'assessment_types' => 'array',
        'is_active' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class, 'academic_session_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(StudentUnitRegistration::class);
    }
}
