<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeAssignmentAudit extends Model
{
    use HasUuids;

    protected $table = 'fee_assignment_audits';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'curriculum_fee_structure_id',
        'modified_by',
        'field',
        'old_value',
        'new_value',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'old_value' => 'float',
            'new_value' => 'float',
        ];
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(CurriculumFeeStructure::class, 'curriculum_fee_structure_id');
    }

    public function modifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'modified_by');
    }
}
