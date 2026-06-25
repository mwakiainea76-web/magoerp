<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class HostelBed extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'hostel_room_id',
        'bed_number',
        'label',
        'is_active',
    ];

    protected $casts = [
        'bed_number' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function room(): BelongsTo
    {
        return $this->belongsTo(HostelRoom::class, 'hostel_room_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(HostelAllocation::class, 'hostel_bed_id');
    }
}
