<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SecurityDevice extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'uuid',
        'fingerprint_hash',
        'browser',
        'browser_version',
        'platform',
        'operating_system',
        'device_type',
        'language',
        'timezone',
        'screen_resolution',
        'user_agent',
        'user_id',
        'first_seen_at',
        'last_seen_at',
        'risk_score',
        'is_trusted',
    ];

    protected $casts = [
        'is_trusted' => 'boolean',
        'risk_score' => 'integer',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(SecurityUserSession::class, 'device_id');
    }

    public function trustedBy(): HasOne
    {
        return $this->hasOne(SecurityTrustedDevice::class, 'device_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(SecurityEvent::class, 'device_id');
    }

    public function block(): HasOne
    {
        return $this->hasOne(SecurityBlockedDevice::class, 'device_id');
    }
}
