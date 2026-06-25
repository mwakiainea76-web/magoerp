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
        'duration',
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

    public function invoiceTemplates(): HasMany
    {
        return $this->hasMany(CourseInvoiceTemplate::class, 'course_id');
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
