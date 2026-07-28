<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\SystemConfiguration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SystemConfigurationsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $configs = SystemConfiguration::query()
            ->orderBy('key')
            ->get()
            ->map(fn (SystemConfiguration $c) => [
                'key' => $c->key,
                'value' => match ($c->type) {
                    'boolean' => filter_var($c->value, FILTER_VALIDATE_BOOLEAN),
                    'multi_select' => $c->value ? array_map('trim', explode(',', $c->value)) : [],
                    default => $c->value,
                },
                'label' => $c->label,
                'type' => $c->type,
            ])
            ->values();

        return response()->json(['data' => $configs]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $config = SystemConfiguration::where('key', $key)->firstOrFail();

        $rules = match ($config->type) {
            'integer' => ['required', 'integer', 'min:1'],
            'boolean' => ['required', 'boolean'],
            'multi_select' => ['required', 'string', function (string $attribute, mixed $value, \Closure $fail) {
                $names = array_map('trim', explode(',', $value));
                $names = array_filter($names);
                if (empty($names)) {
                    $fail('At least one role must be selected.');
                    return;
                }
                $existing = Role::whereIn('name', $names)->pluck('name')->all();
                $missing = array_diff($names, $existing);
                if (! empty($missing)) {
                    $fail('Invalid role(s): ' . implode(', ', $missing));
                }
            }],
            default => ['required', 'string'],
        };

        $validated = $request->validate([
            'value' => $rules,
        ]);

        $newValue = (string) $validated['value'];

        $config->update([
            'value' => $newValue,
        ]);

        return response()->json([
            'message' => 'Configuration updated successfully.',
            'data' => [
                'key' => $config->key,
                'value' => $config->type === 'boolean' ? filter_var($config->value, FILTER_VALIDATE_BOOLEAN) : $config->value,
                'label' => $config->label,
                'type' => $config->type,
            ],
        ]);
    }
}
