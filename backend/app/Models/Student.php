<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'admission_number',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'status' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sessionEnrolments(): HasMany
    {
        return $this->hasMany(AcademicSessionEnrolment::class);
    }

    public function courseEnrolments(): HasMany
    {
        return $this->hasMany(CourseEnrolment::class);
    }

    public function activeEnrolment(): HasOne
    {
        return $this->hasOne(CourseEnrolment::class)->where('status', 'enrolled');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function getFirstNameAttribute(): ?string
    {
        return $this->user?->first_name;
    }

    public function getMiddleNameAttribute(): ?string
    {
        return $this->user?->middle_name;
    }

    public function getLastNameAttribute(): ?string
    {
        return $this->user?->last_name;
    }

    public function getFullNameAttribute(): ?string
    {
        return $this->user ? trim(collect([$this->user->first_name, $this->user->middle_name, $this->user->last_name])->filter()->implode(' ')) : null;
    }
}
