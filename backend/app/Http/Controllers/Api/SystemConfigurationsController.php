<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
                'value' => $c->type === 'boolean' ? filter_var($c->value, FILTER_VALIDATE_BOOLEAN) : $c->value,
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

        $validated = $request->validate([
            'value' => match ($config->type) {
                'integer' => ['required', 'integer', 'min:1'],
                'boolean' => ['required', 'boolean'],
                default => ['required', 'string'],
            },
        ]);

        $config->update([
            'value' => (string) $validated['value'],
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
