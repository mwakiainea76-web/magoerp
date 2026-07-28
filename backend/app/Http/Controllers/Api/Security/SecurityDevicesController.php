<?php

namespace App\Http\Controllers\Api\Security;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\SecurityDevice;
use App\Services\Security\DeviceManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityDevicesController extends Controller
{
    use PaginationMeta;

    public function __construct(
        private readonly DeviceManager $deviceManager,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $isTrusted = (string) $request->string('is_trusted', '');
        $deviceType = (string) $request->string('device_type', '');
        $userId = (string) $request->string('user_id', '');
        $sortBy = (string) $request->string('sort_by', 'last_seen_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $devices = SecurityDevice::with('user')
            ->when($search !== '', fn ($q) => $q->where(function ($q) use ($search) {
                $q->where('browser', 'like', "%{$search}%")
                    ->orWhere('operating_system', 'like', "%{$search}%")
                    ->orWhere('device_type', 'like', "%{$search}%")
                    ->orWhere('uuid', 'like', "%{$search}%");
            }))
            ->when($isTrusted !== '', fn ($q) => $q->where('is_trusted', $isTrusted === 'true'))
            ->when($deviceType !== '', fn ($q) => $q->where('device_type', $deviceType))
            ->when($userId !== '', fn ($q) => $q->where('user_id', $userId))
            ->orderBy($sortBy, $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $devices->getCollection()->map(fn (SecurityDevice $d) => $this->transform($d))->values(),
            'meta' => $this->paginationMeta($devices, [
                'q' => $search,
                'is_trusted' => $isTrusted,
                'device_type' => $deviceType,
                'user_id' => $userId,
            ]),
        ]);
    }

    public function show(Request $request, SecurityDevice $securityDevice): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $securityDevice->load('user', 'sessions', 'events');

        return response()->json(['data' => $this->transform($securityDevice)]);
    }

    public function destroy(Request $request, SecurityDevice $securityDevice): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $securityDevice->delete();

        return response()->json(['message' => 'Device removed.']);
    }

    private function transform(SecurityDevice $d): array
    {
        return [
            'id' => $d->id,
            'uuid' => $d->uuid,
            'browser' => $d->browser,
            'browser_version' => $d->browser_version,
            'platform' => $d->platform,
            'operating_system' => $d->operating_system,
            'device_type' => $d->device_type,
            'language' => $d->language,
            'timezone' => $d->timezone,
            'screen_resolution' => $d->screen_resolution,
            'user_id' => $d->user_id,
            'user_name' => $d->user?->full_name,
            'first_seen_at' => $d->first_seen_at,
            'last_seen_at' => $d->last_seen_at,
            'risk_score' => $d->risk_score,
            'is_trusted' => $d->is_trusted,
        ];
    }
}
