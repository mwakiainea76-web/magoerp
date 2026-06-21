<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class staffs extends Model
{
    /** @use HasFactory<\Database\Factories\StaffsFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'employee_number',
        'payroll_number',
        'first_name',
        'middle_name',
        'last_name',
        'kra_pin',
        'nhif_number',
        'nssf_number',
        'department_id',
        'job_title',
        'employment_type',
        'date_joined',
        'confirmation_date',
        'contract_end_date',
        'basic_salary',
        'is_teaching_staff',
        'highest_qualification',
        'specialization',
        'professional_certifications',
        'work_experience',
        'status',
        'termination_date',
        'termination_reason',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date_joined' => 'date',
        'confirmation_date' => 'date',
        'contract_end_date' => 'date',
        'basic_salary' => 'decimal:2',
        'is_teaching_staff' => 'boolean',
        'status' => 'boolean',
        'termination_date' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(departments::class, 'department_id');
    }

    public function headedDepartments(): HasMany
    {
        return $this->hasMany(departments::class, 'head_of_department');
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
