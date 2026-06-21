<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class departments extends Model
{
    /** @use HasFactory<\Database\Factories\DepartmentsFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'name',
        'head_of_department',
        'description',
        'created_by',
        'updated_by',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function headOfDepartment(): BelongsTo
    {
        return $this->belongsTo(staffs::class, 'head_of_department');
    }

    public function staffs(): HasMany
    {
        return $this->hasMany(staffs::class, 'department_id');
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
