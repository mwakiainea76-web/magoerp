<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Unit extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'course_curriculum_id',
        'code',
        'name',
        'description',
        'modules_taught',
        'taught_hours',
        'credit_factor',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'modules_taught' => 'integer',
        'taught_hours' => 'integer',
        'credit_factor' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function courseCurriculum(): BelongsTo
    {
        return $this->belongsTo(CourseCurriculum::class);
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