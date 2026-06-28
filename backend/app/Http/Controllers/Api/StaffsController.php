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
use Illuminate\Support\Str;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class StaffsController extends Controller
{
    use PaginationMeta;

    public function index(Request $request): JsonResponse
    {
        // User must have staff.view permission to view
        abort_unless($request->user()?->can('staff.view'), 403);
        $search         = trim((string) $request->string('q', ''));
        $sortBy         = (string) $request->string('sort_by', 'created_at');
        $sortDirection  = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage        = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'employee_number' => 'employee_number',
            'job_title'       => 'job_title',
            'created_at'      => 'created_at',
        ];

        $staffs = staffs::query()
            ->with(['user', 'department'])
           ->when($search !== '', function ($query) use ($search) {
    $query->where(function ($q) use ($search) {
        $q->where('employee_number', 'like', "%{$search}%")
          ->orWhereHas('user', fn ($uq) =>
              $uq->where('email', 'like', "%{$search}%")
                 ->orWhere('national_id', 'like', "%{$search}%")
          );
    });
})
            ->orderBy($sortableColumns[$sortBy] ?? 'employee_number', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $staffs->getCollection()
                ->map(fn (staffs $staff) => $this->transformStaff($staff, includeSalary: false))
                ->values(),
            'meta' => $this->paginationMeta($staffs, [
                'q'              => $search,
                'sort_by'        => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }


    // Pregenerates employee number for the next staff to be created. 
    // This is a hint for the UI and does not lock the table.
    public function meta(Request $request): JsonResponse
    {
        // User must have staff.create permission to view meta
        abort_unless($request->user()?->can('staff.create'), 403);
        return response()->json([
            'next_employee_number' => $this->previewEmployeeNumber(),
        ]);
    }

    public function store(StorestaffsRequest $request): JsonResponse
    {
        // User must have staff.create permission to create staff
        abort_unless($request->user()?->can('staff.create'), 403);
        $staff = DB::transaction(function () use ($request) {
            // Lock the table inside the transaction to prevent  duplicate employee numbers under concurrent requests.
            $count          = staffs::withTrashed()->lockForUpdate()->count();
            $employeeNumber = $this->buildEmployeeNumber($count + 1);

            
            $user = User::create([
                'login_id'                    => $employeeNumber,
                'email'                       => $request->email,
                'password'                    => bcrypt($request->phone_number), 
                'role'                        => $request->role,
                'first_name'                  => $request->first_name,
                'middle_name'                 => $request->middle_name,
                'last_name'                   => $request->last_name,
                'gender'                      => $request->gender,
                'date_of_birth'               => $request->date_of_birth,
                'nationality'                 => $request->nationality,
                'national_id'                 => $request->national_id,
                'place_of_birth'              => $request->place_of_birth,
                'religion'                    => $request->religion,
                'phone_number'                => $request->phone_number,
                'alternative_phone_number'    => $request->alternative_phone_number,
                'county'                      => $request->county,
                'is_pwd'                      => $request->boolean('is_pwd'),
                'disability_type'             => $request->disability_type,
                'disability_description'      => $request->disability_description,
                'next_of_kin_first_name'      => $request->next_of_kin_first_name,
                'next_of_kin_last_name'       => $request->next_of_kin_last_name,
                'next_of_kin_phone'           => $request->next_of_kin_phone,
                'next_of_kin_alt_phone'       => $request->next_of_kin_alt_phone,
                'next_of_kin_email'           => $request->next_of_kin_email,
                'next_of_kin_relationship'    => $request->next_of_kin_relationship,
                'must_reset_password'         => true,   // enforce reset on first login
                'created_by'                  => $request->user()->id,
                'updated_by'                  => $request->user()->id,
            ]);

            $user->assignRole($request->role);

            $staff = staffs::create([
                'user_id'               => $user->id,
                'employee_number'       => $employeeNumber,
                'kra_pin'               => $request->kra_pin,
                'nhif_number'           => $request->nhif_number,
                'nssf_number'           => $request->nssf_number,
                'department_id'         => $request->department_id,
                'job_title'             => $request->job_title,
                'employment_type'       => $request->employment_type,
                'date_joined'           => $request->date_joined ?? now()->toDateString(),
                'contract_end_date'     => $request->contract_end_date,
                'basic_salary'          => $request->basic_salary,
                'highest_qualification' => $request->highest_qualification,
                'specialization'        => $request->specialization,
                'status'                => $request->status,
                'created_by'            => $request->user()->id,
                'updated_by'            => $request->user()->id,
            ]);

            $staff->load(['user', 'department']);

            return $staff;
        });

        // TODO: dispatch a PasswordSetupNotification to $staff->user->email
        // so the new employee can set their own password.

        return response()->json([
            'message' => 'Staff created successfully.',
            'data'    => $this->transformStaff($staff),
        ], 201);
    }

    public function show(Request $request, staffs $staff): JsonResponse
    {
        abort_unless($request->user()?->can('staff.view'), 403);

        $staff->load(['user', 'department']);

        return response()->json([
            'data' => $this->transformStaff($staff, includeSalary: true),
        ]);
    }

    public function update(UpdatestaffsRequest $request, staffs $staff): JsonResponse
    {
        abort_unless($request->user()?->can('staff.update'), 403);

        $staff = DB::transaction(function () use ($request, $staff) {
            $user = $staff->user;

            $user->update([
                'email'                       => $request->email,
                'role'                        => $request->role,
                'first_name'                  => $request->first_name,
                'middle_name'                 => $request->middle_name,
                'last_name'                   => $request->last_name,
                'gender'                      => $request->gender,
                'date_of_birth'               => $request->date_of_birth,
                'nationality'                 => $request->nationality,
                'national_id'                 => $request->national_id,
                'place_of_birth'              => $request->place_of_birth,
                'religion'                    => $request->religion,
                'phone_number'                => $request->phone_number,
                'alternative_phone_number'    => $request->alternative_phone_number,
                'county'                      => $request->county,
                'is_pwd'                      => $request->boolean('is_pwd'),
                'disability_type'             => $request->disability_type,
                'disability_description'      => $request->disability_description,
                'next_of_kin_first_name'      => $request->next_of_kin_first_name,
                'next_of_kin_last_name'       => $request->next_of_kin_last_name,
                'next_of_kin_phone'           => $request->next_of_kin_phone,
                'next_of_kin_alt_phone'       => $request->next_of_kin_alt_phone,
                'next_of_kin_email'           => $request->next_of_kin_email,
                'next_of_kin_relationship'    => $request->next_of_kin_relationship,
                'updated_by'                  => $request->user()->id,
            ]);

            if ($user->role !== $request->role) {
                $user->syncRoles([$request->role]);
            }

            $staff->update([
                'kra_pin'               => $request->kra_pin,
                'nhif_number'           => $request->nhif_number,
                'nssf_number'           => $request->nssf_number,
                'department_id'         => $request->department_id,
                'job_title'             => $request->job_title,
                'employment_type'       => $request->employment_type,
                'date_joined'           => $request->date_joined ?? $staff->date_joined,
                'contract_end_date'     => $request->contract_end_date,
                'basic_salary'          => $request->basic_salary,
                'highest_qualification' => $request->highest_qualification,
                'specialization'        => $request->specialization,
                'status'                => $request->status,
                'updated_by'            => $request->user()->id,
            ]);

            $staff->load(['user', 'department']);

            return $staff;
        });

        return response()->json([
            'message' => 'Staff updated successfully.',
            'data'    => $this->transformStaff($staff),
        ]);
    }

    public function destroy(Request $request, staffs $staff): JsonResponse
    {
        abort_unless($request->user()?->can('staff.delete'), 403);

        DB::transaction(function () use ($staff) {
            //  Fixed: disable the linked User account so they can't log in
            // after being removed. Soft-delete or deactivate depending on policy.
            $staff->user?->update(['status' => false]);
            $staff->user?->tokens()->delete();   // revoke active sessions
            $staff->delete();
        });

        return response()->json([
            'message' => 'Staff deleted successfully.',
        ]);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Build a formatted employee number from a sequence integer.
     * e.g. buildEmployeeNumber(42) => "EMP/042/25"
     */
    private function buildEmployeeNumber(int $sequence): string
    {
        return sprintf('EMP/%s/%s', str_pad($sequence, 3, '0', STR_PAD_LEFT), now()->format('y'));
    }

    /**
     * Non-locking preview for the meta endpoint.
     * Intentionally not locked — it's just a hint to the UI.
     */
    private function previewEmployeeNumber(): string
    {
        return $this->buildEmployeeNumber(staffs::withTrashed()->count() + 1);
    }

    /**
     * Serialize a Staff model for API responses.
     *
     * @param bool $includeSalary  Pass false for list endpoints to avoid
     *                             broadcasting salary to users who only have
     *                             staff.view (not staff.view_salary).
     */
    private function transformStaff(staffs $staff, bool $includeSalary = true): array
    {
        $user       = $staff->user;
        $department = $staff->department;

        $data = [
            'id'          => $staff->id,
            'user_id'     => $staff->user_id,
            'login_id'    => $user?->login_id,
            'email'       => $user?->email,
            'role'        => $user?->role,

            'employee_number' => $staff->employee_number,

            'first_name'  => $user?->first_name,
            'middle_name' => $user?->middle_name,
            'last_name'   => $user?->last_name,
            'full_name'   => trim(
                collect([$user?->first_name, $user?->middle_name, $user?->last_name])
                    ->filter()
                    ->implode(' ')
            ),

            'gender'                   => $user?->gender,
            'date_of_birth'            => $user?->date_of_birth?->format('Y-m-d'),
            'nationality'              => $user?->nationality,
            'national_id'              => $user?->national_id,
            'place_of_birth'           => $user?->place_of_birth,
            'religion'                 => $user?->religion,
            'phone_number'             => $user?->phone_number,
            'alternative_phone_number' => $user?->alternative_phone_number,
            'county'                   => $user?->county,

            'department_id'   => $staff->department_id,
            'department_name' => $department?->name,
            'department_code' => $department?->code,

            'job_title'             => $staff->job_title,
            'employment_type'       => $staff->employment_type,
            'date_joined'           => $staff->date_joined?->format('Y-m-d'),
            'contract_end_date'     => $staff->contract_end_date?->format('Y-m-d'),

            'kra_pin'     => $staff->kra_pin,
            'nhif_number' => $staff->nhif_number,
            'nssf_number' => $staff->nssf_number,

            'highest_qualification' => $staff->highest_qualification,
            'specialization'        => $staff->specialization,

            'is_pwd'                 => $user?->is_pwd,
            'disability_type'        => $user?->disability_type,
            'disability_description' => $user?->disability_description,

            'next_of_kin_first_name'   => $user?->next_of_kin_first_name,
            'next_of_kin_last_name'    => $user?->next_of_kin_last_name,
            'next_of_kin_phone'        => $user?->next_of_kin_phone,
            'next_of_kin_alt_phone'    => $user?->next_of_kin_alt_phone,
            'next_of_kin_email'        => $user?->next_of_kin_email,
            'next_of_kin_relationship' => $user?->next_of_kin_relationship,

            'status'     => $staff->status,
            'created_at' => $staff->created_at,
            'updated_at' => $staff->updated_at,
        ];

        if ($includeSalary) {
            $data['basic_salary'] = $staff->basic_salary;
        }

        return $data;
    }
}