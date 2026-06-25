<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Http\Requests\StoredepartmentsRequest;
use App\Http\Requests\UpdatedepartmentsRequest;
use App\Models\departments;
use App\Models\staffs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

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
            ->with(['headOfDepartment.user'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('headOfDepartment', function ($staffQuery) use ($search) {
                            $staffQuery
                                ->where('employee_number', 'like', "%{$search}%")
                                ->orWhere('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        });
                });
            })
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $departments->getCollection()->map(fn (departments $department) => $this->transformDepartment($department))->values(),
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
            ->where('status', true)
            ->with('user')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (staffs $staff) => [
                'id' => $staff->id,
                'employee_number' => $staff->employee_number,
                'name' => trim($staff->first_name . ' ' . $staff->last_name),
                'job_title' => $staff->job_title,
                'label' => trim($staff->first_name . ' ' . $staff->last_name) . ' (' . $staff->employee_number . ')',
            ]);

        return response()->json([
            'head_of_department_options' => $staffOptions,
        ]);
    }

    public function store(StoredepartmentsRequest $request): JsonResponse
    {
        $department = departments::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $department->load(['headOfDepartment.user']);

        return response()->json([
            'message' => 'Department created successfully.',
            'data' => $this->transformDepartment($department),
        ], 201);
    }

    public function show(Request $request, departments $department): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $department->load(['headOfDepartment.user']);

        return response()->json([
            'data' => $this->transformDepartment($department),
        ]);
    }

    public function update(UpdatedepartmentsRequest $request, departments $department): JsonResponse
    {
        $department->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $department->load(['headOfDepartment.user']);

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
        $head = $department->headOfDepartment;

        return [
            'id' => $department->id,
            'code' => $department->code,
            'name' => $department->name,
            'description' => $department->description,
            'head_of_department' => $department->head_of_department,
            'head_of_department_name' => $head ? trim($head->first_name . ' ' . $head->last_name) : null,
            'head_of_department_employee_number' => $head?->employee_number,
            'created_at' => $department->created_at,
            'updated_at' => $department->updated_at,
        ];
    }


}
