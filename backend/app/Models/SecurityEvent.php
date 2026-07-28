<?php

namespace App\Models;

use App\Enums\Security\SecurityEventType;
use App\Enums\Security\Severity;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityEvent extends Model
{
    use HasFactory, HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'device_id',
        'session_id',
        'ip_address',
        'event_type',
        'risk_points',
        'severity',
        'metadata',
        'resolved',
    ];

    protected $casts = [
        'event_type' => SecurityEventType::class,
        'severity' => Severity::class,
        'risk_points' => 'integer',
        'metadata' => 'array',
        'resolved' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(SecurityDevice::class, 'device_id');
    }
}
