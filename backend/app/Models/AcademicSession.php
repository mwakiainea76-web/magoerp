<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AcademicSession extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'academic_year_id',
        'code',
        'name',
        'start_date',
        'end_date',
        'description',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    protected static function booted(): void
    {
        static::saving(function ($model) {
            if ($model->is_active) {
                static::where('id', '!=', $model->id)
                    ->where('academic_year_id', $model->academic_year_id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }
        });

        static::saved(function (AcademicSession $session) {
            if ($session->is_active && $session->wasChanged('is_active')) {
                CurriculumFeeStructure::query()
                    ->where('academic_session_id', $session->id)
                    ->where('dormant', true)
                    ->update(['dormant' => false]);
            }
        });
    }

    public function year(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function sessionEnrolments(): HasMany
    {
        return $this->hasMany(AcademicSessionEnrolment::class);
    }

    public function timetables(): HasMany
    {
        return $this->hasMany(AcademicTimetable::class, 'academic_session_id');
    }

    public function calendarEvents(): HasMany
    {
        return $this->hasMany(CalendarEvent::class, 'academic_session_id');
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
