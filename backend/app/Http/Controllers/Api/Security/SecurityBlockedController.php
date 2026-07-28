<?php

namespace App\Http\Controllers\Api\Security;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Models\SecurityBlockedDevice;
use App\Models\SecurityBlockedIp;
use App\Models\SecurityBlockedSession;
use App\Models\SecurityBlockedUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SecurityBlockedController extends Controller
{
    use PaginationMeta;

    // ---- IPs ----

    public function indexIps(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $items = SecurityBlockedIp::with('creator')
            ->when($search !== '', fn ($q) => $q->where('ip_address', 'like', "%{$search}%")
                ->orWhere('reason', 'like', "%{$search}%"))
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $items->getCollection()->map(fn (SecurityBlockedIp $b) => [
                'id' => $b->id,
                'ip_address' => $b->ip_address,
                'reason' => $b->reason,
                'blocked_until' => $b->blocked_until,
                'is_permanent' => $b->blocked_until === null,
                'created_by' => $b->creator?->full_name,
                'created_at' => $b->created_at,
            ])->values(),
            'meta' => $this->paginationMeta($items, ['q' => $search]),
        ]);
    }

    public function storeIp(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $validated = $request->validate([
            'ip_address' => ['required', 'ip', 'unique:security_blocked_ips,ip_address'],
            'reason' => ['nullable', 'string', 'max:255'],
            'blocked_until' => ['nullable', 'date'],
        ]);

        $blocked = SecurityBlockedIp::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $blocked, 'message' => 'IP blocked.'], 201);
    }

    public function destroyIp(Request $request, SecurityBlockedIp $securityBlockedIp): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $securityBlockedIp->delete();

        return response()->json(['message' => 'IP unblocked.']);
    }

    // ---- Devices ----

    public function indexDevices(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $items = SecurityBlockedDevice::with('device', 'creator')
            ->when($search !== '', fn ($q) => $q->where('reason', 'like', "%{$search}%"))
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $items->getCollection()->map(fn (SecurityBlockedDevice $b) => [
                'id' => $b->id,
                'device_id' => $b->device_id,
                'device_uuid' => $b->device?->uuid,
                'device_browser' => $b->device?->browser,
                'device_os' => $b->device?->operating_system,
                'reason' => $b->reason,
                'blocked_until' => $b->blocked_until,
                'is_permanent' => $b->blocked_until === null,
                'created_by' => $b->creator?->full_name,
                'created_at' => $b->created_at,
            ])->values(),
            'meta' => $this->paginationMeta($items, ['q' => $search]),
        ]);
    }

    public function storeDevice(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $validated = $request->validate([
            'device_id' => ['required', 'string', 'exists:security_devices,id'],
            'reason' => ['nullable', 'string', 'max:255'],
            'blocked_until' => ['nullable', 'date'],
        ]);

        $blocked = SecurityBlockedDevice::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        Cache::forget('device:blocked:' . $validated['device_id']);

        return response()->json(['data' => $blocked, 'message' => 'Device blocked.'], 201);
    }

    public function destroyDevice(Request $request, SecurityBlockedDevice $securityBlockedDevice): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $deviceId = $securityBlockedDevice->device_id;
        $securityBlockedDevice->delete();

        Cache::forget('device:blocked:' . $deviceId);

        return response()->json(['message' => 'Device unblocked.']);
    }

    // ---- Users ----

    public function indexUsers(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $items = SecurityBlockedUser::with('user', 'creator')
            ->when($search !== '', fn ($q) => $q->where('reason', 'like', "%{$search}%"))
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $items->getCollection()->map(fn (SecurityBlockedUser $b) => [
                'id' => $b->id,
                'user_id' => $b->user_id,
                'user_name' => $b->user?->full_name,
                'reason' => $b->reason,
                'blocked_until' => $b->blocked_until,
                'is_permanent' => $b->blocked_until === null,
                'created_by' => $b->creator?->full_name,
                'created_at' => $b->created_at,
            ])->values(),
            'meta' => $this->paginationMeta($items, ['q' => $search]),
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $validated = $request->validate([
            'user_id' => ['required', 'string', 'exists:users,id'],
            'reason' => ['nullable', 'string', 'max:255'],
            'blocked_until' => ['nullable', 'date'],
        ]);

        $blocked = SecurityBlockedUser::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $blocked, 'message' => 'User blocked.'], 201);
    }

    public function destroyUser(Request $request, SecurityBlockedUser $securityBlockedUser): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $securityBlockedUser->delete();

        return response()->json(['message' => 'User unblocked.']);
    }

    // ---- Sessions ----

    public function indexSessions(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $items = SecurityBlockedSession::with('creator')
            ->when($search !== '', fn ($q) => $q->where('reason', 'like', "%{$search}%")
                ->orWhere('session_id', 'like', "%{$search}%"))
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $items->getCollection()->map(fn (SecurityBlockedSession $b) => [
                'id' => $b->id,
                'session_id' => $b->session_id,
                'reason' => $b->reason,
                'blocked_until' => $b->blocked_until,
                'is_permanent' => $b->blocked_until === null,
                'created_by' => $b->creator?->full_name,
                'created_at' => $b->created_at,
            ])->values(),
            'meta' => $this->paginationMeta($items, ['q' => $search]),
        ]);
    }

    public function storeSession(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $validated = $request->validate([
            'session_id' => ['required', 'string', 'max:100'],
            'reason' => ['nullable', 'string', 'max:255'],
            'blocked_until' => ['nullable', 'date'],
        ]);

        $blocked = SecurityBlockedSession::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $blocked, 'message' => 'Session blocked.'], 201);
    }

    public function destroySession(Request $request, SecurityBlockedSession $securityBlockedSession): JsonResponse
    {
        abort_unless($request->user()?->can('security.manage'), 403);

        $securityBlockedSession->delete();

        return response()->json(['message' => 'Session unblocked.']);
    }
}
