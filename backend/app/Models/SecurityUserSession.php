<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityUserSession extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'device_id',
        'session_id',
        'ip_address',
        'country',
        'city',
        'browser',
        'operating_system',
        'login_at',
        'last_activity',
        'logout_at',
        'is_active',
        'remember_token_used',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'remember_token_used' => 'boolean',
        'login_at' => 'datetime',
        'last_activity' => 'datetime',
        'logout_at' => 'datetime',
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
