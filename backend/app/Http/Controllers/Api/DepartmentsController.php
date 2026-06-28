<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoredepartmentsRequest;
use App\Http\Requests\UpdatedepartmentsRequest;
use App\Models\departments;
use App\Models\staffs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentsController extends Controller
{
    use PaginationMeta;

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'code' => 'code',
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $departments = departments::query()
            ->with($this->departmentRelations())
            ->when($search !== '', function ($query) use ($search) {
                $query->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            })
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $departments->getCollection()
                ->map(fn (departments $department) => $this->transformDepartmentSummary($department))
                ->values(),
            'meta' => $this->paginationMeta($departments, [
                'q' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function meta(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $staffOptions = staffs::query()
            ->select(['id', 'user_id', 'employee_number', 'job_title'])
            ->where('status', true)
            ->with(['user:id,first_name,last_name'])
            ->orderBy(\App\Models\User::select('first_name')->whereColumn('users.id', 'staffs.user_id'))
            ->orderBy(\App\Models\User::select('last_name')->whereColumn('users.id', 'staffs.user_id'))
            ->get()
            ->map(fn (staffs $staff) => [
                'id' => $staff->id,
                'employee_number' => $staff->employee_number,
                'name' => trim(collect([$staff->user?->first_name, $staff->user?->last_name])->filter()->implode(' ')),
                'job_title' => $staff->job_title,
                'label' => trim(collect([$staff->user?->first_name, $staff->user?->last_name])->filter()->implode(' ')) . ' (' . $staff->employee_number . ')',
            ]);

        return response()->json([
            'head_of_department_options' => $staffOptions,
        ]);
    }

    public function store(StoredepartmentsRequest $request): JsonResponse
    {
        $staffId = $request->user()?->staff?->id;

        $department = departments::create([
            ...$request->validated(),
            'created_by' => $staffId,
            'updated_by' => $staffId,
        ]);

        $department->load($this->departmentRelations());

        return response()->json([
            'message' => 'Department created successfully.',
            'data' => $this->transformDepartment($department),
        ], 201);
    }

    public function show(Request $request, departments $department): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $department->load($this->departmentRelations());

        return response()->json([
            'data' => $this->transformDepartment($department),
        ]);
    }

    public function update(UpdatedepartmentsRequest $request, departments $department): JsonResponse
    {
        $department->update([
            ...$request->validated(),
            'updated_by' => $request->user()?->staff?->id,
        ]);

        $department->load($this->departmentRelations());

        return response()->json([
            'message' => 'Department updated successfully.',
            'data' => $this->transformDepartment($department),
        ]);
    }

    public function destroy(Request $request, departments $department): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        $department->delete();

        return response()->json([
            'message' => 'Department deleted successfully.',
        ]);
    }

    private function transformDepartment(departments $department): array
    {
        return [
            ...$this->transformDepartmentSummary($department),
            'description' => $department->description,
        ];
    }

    private function transformDepartmentSummary(departments $department): array
    {
        $head = $department->headOfDepartment;

        return [
            'id' => $department->id,
            'code' => $department->code,
            'name' => $department->name,
            'head_of_department' => $department->head_of_department,
            'head_of_department_name' => $head
                ? trim(collect([$head->user?->first_name, $head->user?->last_name])->filter()->implode(' '))
                : null,
            'head_of_department_employee_number' => $head?->employee_number,
            'created_at' => $department->created_at,
            'updated_at' => $department->updated_at,
        ];
    }

    private function departmentRelations(): array
    {
        return [
            'headOfDepartment:id,user_id,employee_number',
            'headOfDepartment.user:id,first_name,last_name',
        ];
    }
}
