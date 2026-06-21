<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SyncRolePermissionsRequest;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccessRolePermissionsController extends Controller
{
    public function index(Request $request, Role $access_role): JsonResponse
    {
        abort_unless($request->user()?->can('staff.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $group = (string) $request->string('group', '');
        $sortBy = (string) $request->string('sort_by', 'name');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 50), 200));

        $sortableColumns = [
            'name' => 'name',
            'guard_name' => 'guard_name',
        ];

        $assignedIds = $access_role->permissions()->pluck('id')->toArray();

        $permissions = Permission::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('guard_name', 'like', "%{$search}%");
                });
            })
            ->when($group !== '', function ($query) use ($group) {
                $query->where('name', 'like', "{$group}.%");
            })
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $permissions->getCollection()->map(fn (Permission $perm) => [
                'id' => $perm->id,
                'name' => $perm->name,
                'guard_name' => $perm->guard_name,
                'is_assigned' => in_array($perm->id, $assignedIds, true),
            ])->values(),
            'meta' => $this->paginationMeta($permissions, [
                'q' => $search,
                'group' => $group,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function sync(SyncRolePermissionsRequest $request, Role $access_role): JsonResponse
    {
        $access_role->syncPermissions($request->permission_ids);

        return response()->json([
            'message' => 'Role permissions updated successfully.',
        ]);
    }

    /** Return grouped permissions for the role form (non-paginated) */
    public function grouped(Request $request, Role $access_role): JsonResponse
    {
        abort_unless($request->user()?->can('staff.view'), 403);

        $allPermissions = Permission::query()
            ->orderBy('name')
            ->get();

        $assignedIds = $access_role->permissions()->pluck('id')->toArray();

        $groups = [];
        foreach ($allPermissions as $perm) {
            $group = explode('.', $perm->name)[0] ?? 'other';
            $groups[$group][] = [
                'id' => $perm->id,
                'name' => $perm->name,
                'guard_name' => $perm->guard_name,
                'is_assigned' => in_array($perm->id, $assignedIds, true),
            ];
        }

        $grouped = collect($groups)
            ->map(fn (array $perms, string $key) => [
                'group' => $key,
                'permissions' => $perms,
            ])
            ->values();

        return response()->json([
            'data' => $grouped,
        ]);
    }

    private function paginationMeta($paginator, array $filters): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
            'filters' => $filters,
        ];
    }
}
