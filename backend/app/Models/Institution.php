<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Institution extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'code',
        'postal_address',
        'telephone',
        'email',
        'website',
        'motto',
        'logo',
        'facebook',
        'twitter',
        'instagram',
        'linkedin',
        'youtube',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
