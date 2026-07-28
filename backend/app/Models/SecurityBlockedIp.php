<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityBlockedIp extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'ip_address',
        'reason',
        'blocked_until',
        'created_by',
    ];

    protected $casts = [
        'blocked_until' => 'datetime',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
