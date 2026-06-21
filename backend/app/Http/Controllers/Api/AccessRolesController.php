<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAccessRoleRequest;
use App\Http\Requests\UpdateAccessRoleRequest;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccessRolesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('staff.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $sortBy = (string) $request->string('sort_by', 'name');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'name' => 'name',
            'guard_name' => 'guard_name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $roles = Role::query()
            ->withCount('permissions')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('guard_name', 'like', "%{$search}%");
                });
            })
            ->where('name', '!=', 'super-admin')
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $roles->getCollection()->map(fn (Role $role) => $this->transformRole($role))->values(),
            'meta' => $this->paginationMeta($roles, [
                'q' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreAccessRoleRequest $request): JsonResponse
    {
        $role = Role::create([
            'name' => $request->name,
            'guard_name' => $request->guard_name ?? 'web',
        ]);

        return response()->json([
            'message' => 'Role created successfully.',
            'data' => $this->transformRole($role),
        ], 201);
    }

    public function show(Request $request, Role $access_role): JsonResponse
    {
        abort_unless($request->user()?->can('staff.view'), 403);

        $access_role->loadCount('permissions');

        return response()->json([
            'data' => $this->transformRole($access_role),
        ]);
    }

    public function update(UpdateAccessRoleRequest $request, Role $access_role): JsonResponse
    {
        $access_role->update([
            'name' => $request->name,
            'guard_name' => $request->guard_name ?? 'web',
        ]);

        $access_role->loadCount('permissions');

        return response()->json([
            'message' => 'Role updated successfully.',
            'data' => $this->transformRole($access_role),
        ]);
    }

    public function destroy(Request $request, Role $access_role): JsonResponse
    {
        abort_unless($request->user()?->can('staff.delete'), 403);

        $access_role->delete();

        return response()->json([
            'message' => 'Role deleted successfully.',
        ]);
    }

    private function transformRole(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'guard_name' => $role->guard_name,
            'permissions_count' => (int) ($role->permissions_count ?? $role->permissions()->count()),
            'created_at' => $role->created_at,
            'updated_at' => $role->updated_at,
        ];
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
