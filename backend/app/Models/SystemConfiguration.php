<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SystemConfiguration extends Model
{
    protected $table = 'system_configurations';

    protected $fillable = [
        'key',
        'value',
        'label',
        'type',
    ];

    protected $casts = [
        'value' => 'string',
    ];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $config = static::where('key', $key)->first();

        if (!$config) {
            return $default;
        }

        $value = $config->value;

        return match ($config->type) {
            'integer' => (int) $value,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            default => $value,
        };
    }

    public static function setValue(string $key, mixed $value): void
    {
        $config = static::firstOrNew(['key' => $key]);
        $config->value = (string) $value;
        $config->save();
    }
}
