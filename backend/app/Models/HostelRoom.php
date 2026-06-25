<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class HostelRoom extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'hostel_id',
        'name',
        'code',
        'floor',
        'bed_count',
        'is_active',
    ];

    protected $casts = [
        'bed_count' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function hostel(): BelongsTo
    {
        return $this->belongsTo(Hostel::class);
    }

    public function beds(): HasMany
    {
        return $this->hasMany(HostelBed::class);
    }
}
