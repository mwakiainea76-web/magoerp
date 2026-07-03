<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class HolidaySyncLog extends Model
{
    use HasUuids;

    protected $table = 'holiday_sync_logs';

    protected $fillable = [
        'year',
        'country_code',
        'synced_at',
        'raw_response',
        'status',
    ];

    protected $casts = [
        'year' => 'integer',
        'synced_at' => 'datetime',
        'raw_response' => 'array',
    ];

    protected $keyType = 'string';
    public $incrementing = false;
}