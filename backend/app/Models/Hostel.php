<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Hostel extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'session_fee_amount',
        'gender',
        'location',
        'description',
        'is_active',
    ];

    protected $casts = [
        'session_fee_amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function rooms(): HasMany
    {
        return $this->hasMany(HostelRoom::class);
    }

    public function allocations(): HasManyThrough
    {
        return $this->hasManyThrough(
            HostelAllocation::class,
            HostelRoom::class,
            'hostel_id',
            'hostel_room_id',
            'id',
            'id'
        );
    }
}
