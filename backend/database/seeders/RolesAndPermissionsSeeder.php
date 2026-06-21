<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissionsByRole = [
            'admin' => [
                'dashboard.view',
                'courses.view',
                'courses.create',
                'timetables.view',
                'timetables.create',
                'assessments.view',
                'assessments.create',
                'assessments.publish',
                'analytics.view',
                'students.view',
                'students.create',
                'students.update',
                'students.delete',
                'enrolments.view',
                'enrolments.create',
                'enrolments.update',
                'enrolments.delete',
                'finance.view',
                'finance.create',
                'finance.update',
                'finance.delete',
                'operations.view',
                'institution.view',
                'institution.create',
                'institution.update',
                'institution.delete',
                'staff.view',
                'staff.create',
                'staff.update',
                'staff.delete',
            ],
            'trainer' => [
                'dashboard.view',
                'courses.view',
                'timetables.view',
                'assessments.view',
                'assessments.create',
                'analytics.view',
                'students.view',
                'operations.view',
            ],
            'student' => [
                'dashboard.view',
                'courses.view',
                'timetables.view',
                'assessments.view',
                'analytics.view',
                'finance.view',
                'institution.view',
            ],
        ];

        $allPermissions = collect($permissionsByRole)
            ->flatten()
            ->unique()
            ->values();

        $permissionModels = $allPermissions->mapWithKeys(function (string $permissionName) {
            $permission = Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web',
            ]);

            return [$permissionName => $permission];
        });

        foreach ($permissionsByRole as $roleName => $permissionNames) {
            $role = Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
            ]);

            $role->syncPermissions(
                collect($permissionNames)
                    ->map(fn (string $permissionName) => $permissionModels[$permissionName])
                    ->all()
            );
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
