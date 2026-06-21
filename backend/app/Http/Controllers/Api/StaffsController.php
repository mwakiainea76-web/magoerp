<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorestaffsRequest;
use App\Http\Requests\UpdatestaffsRequest;
use App\Models\staffs;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('staff.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'employee_number' => 'employee_number',
            'first_name' => 'first_name',
            'last_name' => 'last_name',
            'job_title' => 'job_title',
            'created_at' => 'created_at',
        ];

        $staffs = staffs::query()
            ->with(['user', 'department'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('employee_number', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('job_title', 'like', "%{$search}%")
                        ->orWhereHas('department', function ($deptQuery) use ($search) {
                            $deptQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            })
            ->orderBy($sortableColumns[$sortBy] ?? 'employee_number', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $staffs->getCollection()->map(fn (staffs $staff) => $this->transformStaff($staff))->values(),
            'meta' => $this->paginationMeta($staffs, [
                'q' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function meta(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('staff.create'), 403);

        $count = staffs::withTrashed()->count();
        $year = now()->format('y');
        $nextNumber = str_pad($count + 1, 3, '0', STR_PAD_LEFT);

        return response()->json([
            'next_employee_number' => "EMP/{$nextNumber}/{$year}",
        ]);
    }

    public function store(StorestaffsRequest $request): JsonResponse
    {
        $staff = DB::transaction(function () use ($request) {
            $count = staffs::withTrashed()->count();
            $year = now()->format('y');
            $nextNumber = str_pad($count + 1, 3, '0', STR_PAD_LEFT);
            $employeeNumber = "EMP/{$nextNumber}/{$year}";

            $user = User::create([
                'login_id' => $employeeNumber,
                'email' => $request->email,
                'password' => bcrypt($request->phone_number),
                'role' => $request->role,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'gender' => $request->gender,
                'date_of_birth' => $request->date_of_birth,
                'nationality' => $request->nationality,
                'national_id' => $request->national_id,
                'place_of_birth' => $request->place_of_birth,
                'religion' => $request->religion,
                'phone_number' => $request->phone_number,
                'alternative_phone_number' => $request->alternative_phone_number,
                'county' => $request->county,
                'is_pwd' => $request->is_pwd,
                'disability_type' => $request->disability_type,
                'disability_description' => $request->disability_description,
                'next_of_kin_first_name' => $request->next_of_kin_first_name,
                'next_of_kin_last_name' => $request->next_of_kin_last_name,
                'next_of_kin_phone' => $request->next_of_kin_phone,
                'next_of_kin_alt_phone' => $request->next_of_kin_alt_phone,
                'next_of_kin_email' => $request->next_of_kin_email,
                'next_of_kin_relationship' => $request->next_of_kin_relationship,
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            $user->assignRole($request->role);

            $staff = staffs::create([
                'user_id' => $user->id,
                'employee_number' => $employeeNumber,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'kra_pin' => $request->kra_pin,
                'nhif_number' => $request->nhif_number,
                'nssf_number' => $request->nssf_number,
                'department_id' => $request->department_id,
                'job_title' => $request->job_title,
                'employment_type' => $request->employment_type,
                'date_joined' => $request->date_joined ?? now()->format('Y-m-d'),
                'contract_end_date' => $request->contract_end_date,
                'basic_salary' => $request->basic_salary,
                'highest_qualification' => $request->highest_qualification,
                'specialization' => $request->specialization,
                'status' => $request->status,
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            $staff->load(['user', 'department']);

            return $staff;
        });

        return response()->json([
            'message' => 'Staff created successfully.',
            'data' => $this->transformStaff($staff),
        ], 201);
    }

    public function show(Request $request, staffs $staff): JsonResponse
    {
        abort_unless($request->user()?->can('staff.view'), 403);

        $staff->load(['user', 'department']);

        return response()->json([
            'data' => $this->transformStaff($staff),
        ]);
    }

    public function update(UpdatestaffsRequest $request, staffs $staff): JsonResponse
    {
        $staff = DB::transaction(function () use ($request, $staff) {
            $user = $staff->user;

            $userData = [
                'email' => $request->email,
                'role' => $request->role,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'gender' => $request->gender,
                'date_of_birth' => $request->date_of_birth,
                'nationality' => $request->nationality,
                'national_id' => $request->national_id,
                'place_of_birth' => $request->place_of_birth,
                'religion' => $request->religion,
                'phone_number' => $request->phone_number,
                'alternative_phone_number' => $request->alternative_phone_number,
                'county' => $request->county,
                'is_pwd' => $request->is_pwd,
                'disability_type' => $request->disability_type,
                'disability_description' => $request->disability_description,
                'next_of_kin_first_name' => $request->next_of_kin_first_name,
                'next_of_kin_last_name' => $request->next_of_kin_last_name,
                'next_of_kin_phone' => $request->next_of_kin_phone,
                'next_of_kin_alt_phone' => $request->next_of_kin_alt_phone,
                'next_of_kin_email' => $request->next_of_kin_email,
                'next_of_kin_relationship' => $request->next_of_kin_relationship,
                'updated_by' => $request->user()->id,
            ];

            if ($user->role !== $request->role) {
                $user->syncRoles([$request->role]);
            }

            $user->update($userData);

            $staff->update([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'kra_pin' => $request->kra_pin,
                'nhif_number' => $request->nhif_number,
                'nssf_number' => $request->nssf_number,
                'department_id' => $request->department_id,
                'job_title' => $request->job_title,
                'employment_type' => $request->employment_type,
                'date_joined' => $request->date_joined ?? now()->format('Y-m-d'),
                'contract_end_date' => $request->contract_end_date,
                'basic_salary' => $request->basic_salary,
                'highest_qualification' => $request->highest_qualification,
                'specialization' => $request->specialization,
                'status' => $request->status,
                'updated_by' => $request->user()->id,
            ]);

            $staff->load(['user', 'department']);

            return $staff;
        });

        return response()->json([
            'message' => 'Staff updated successfully.',
            'data' => $this->transformStaff($staff),
        ]);
    }

    public function destroy(Request $request, staffs $staff): JsonResponse
    {
        abort_unless($request->user()?->can('staff.delete'), 403);

        $staff->delete();

        return response()->json([
            'message' => 'Staff deleted successfully.',
        ]);
    }

    private function transformStaff(staffs $staff): array
    {
        $user = $staff->user;
        $department = $staff->department;

        return [
            'id' => $staff->id,
            'user_id' => $staff->user_id,

            'login_id' => $user?->login_id,
            'email' => $user?->email,
            'role' => $user?->role,

            'employee_number' => $staff->employee_number,

            'first_name' => $staff->first_name,
            'middle_name' => $staff->middle_name,
            'last_name' => $staff->last_name,
            'full_name' => trim(collect([$staff->first_name, $staff->middle_name, $staff->last_name])->filter()->implode(' ')),

            'gender' => $user?->gender,
            'date_of_birth' => $user?->date_of_birth?->format('Y-m-d'),
            'nationality' => $user?->nationality,
            'national_id' => $user?->national_id,
            'place_of_birth' => $user?->place_of_birth,
            'religion' => $user?->religion,
            'phone_number' => $user?->phone_number,
            'alternative_phone_number' => $user?->alternative_phone_number,

            'county' => $user?->county,

            'department_id' => $staff->department_id,
            'department_name' => $department?->name,
            'department_code' => $department?->code,

            'job_title' => $staff->job_title,
            'employment_type' => $staff->employment_type,
            'date_joined' => $staff->date_joined?->format('Y-m-d'),
            'contract_end_date' => $staff->contract_end_date?->format('Y-m-d'),
            'basic_salary' => $staff->basic_salary,

            'kra_pin' => $staff->kra_pin,
            'nhif_number' => $staff->nhif_number,
            'nssf_number' => $staff->nssf_number,

            'highest_qualification' => $staff->highest_qualification,
            'specialization' => $staff->specialization,

            'is_pwd' => $user?->is_pwd,
            'disability_type' => $user?->disability_type,
            'disability_description' => $user?->disability_description,

            'next_of_kin_first_name' => $user?->next_of_kin_first_name,
            'next_of_kin_last_name' => $user?->next_of_kin_last_name,
            'next_of_kin_phone' => $user?->next_of_kin_phone,
            'next_of_kin_alt_phone' => $user?->next_of_kin_alt_phone,
            'next_of_kin_email' => $user?->next_of_kin_email,
            'next_of_kin_relationship' => $user?->next_of_kin_relationship,

            'status' => $staff->status,
            'created_at' => $staff->created_at,
            'updated_at' => $staff->updated_at,
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

