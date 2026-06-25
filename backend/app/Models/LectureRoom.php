<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class LectureRoom extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'department_id',
        'name',
        'code',
        'capacity',
        'location',
        'description',
        'is_active',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function department(): BelongsTo
    {
        return $this->belongsTo(departments::class);
    }

    public function timetables(): HasMany
    {
        return $this->hasMany(AcademicTimetable::class, 'lecture_room_id');
    }
}
