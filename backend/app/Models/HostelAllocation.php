<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HostelAllocation extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'academic_session_enrolment_id',
        'student_id',
        'academic_session_id',
        'hostel_id',
        'hostel_room_id',
        'hostel_bed_id',
        'hostel_fee_amount',
        'allocated_on',
        'status',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'hostel_fee_amount' => 'decimal:2',
        'allocated_on' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function enrolment(): BelongsTo
    {
        return $this->belongsTo(AcademicSessionEnrolment::class, 'academic_session_enrolment_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function hostel(): BelongsTo
    {
        return $this->belongsTo(Hostel::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(HostelRoom::class, 'hostel_room_id');
    }

    public function bed(): BelongsTo
    {
        return $this->belongsTo(HostelBed::class, 'hostel_bed_id');
    }
}
