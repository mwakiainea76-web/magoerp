<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentUnitRegistration extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'academic_session_enrolment_id',
        'unit_id',
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
}
