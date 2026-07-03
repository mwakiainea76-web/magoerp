<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CalendarEventType extends Model
{
    use HasUuids;

    protected $table = 'calendar_event_types';

    protected $fillable = [
        'code',
        'label',
        'color_hex',
    ];

    protected $casts = [
        'color_hex' => 'string',
    ];

    protected $keyType = 'string';
    public $incrementing = false;

    public function events(): HasMany
    {
        return $this->hasMany(CalendarEvent::class, 'event_type_id');
    }
}