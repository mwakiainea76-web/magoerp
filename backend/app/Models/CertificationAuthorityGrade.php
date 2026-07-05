<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CertificationAuthorityGrade extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'certification_authority_id',
        'grade',
        'grade_start',
        'grade_end',
        'remark',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'grade_start' => 'decimal:2',
        'grade_end' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function authority(): BelongsTo
    {
        return $this->belongsTo(CertificationAuthority::class, 'certification_authority_id');
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
