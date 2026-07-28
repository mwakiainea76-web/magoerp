<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityBlockedDevice extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'device_id',
        'reason',
        'blocked_until',
        'created_by',
    ];

    protected $casts = [
        'blocked_until' => 'datetime',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function device(): BelongsTo
    {
        return $this->belongsTo(SecurityDevice::class, 'device_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
