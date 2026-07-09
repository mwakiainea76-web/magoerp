<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffStatusLog extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'staff_id',
        'from_status',
        'to_status',
        'reason',
        'changed_at',
        'changed_by',
    ];

    protected $casts = [
        'changed_at' => 'date',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function staff(): BelongsTo
    {
        return $this->belongsTo(staffs::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
