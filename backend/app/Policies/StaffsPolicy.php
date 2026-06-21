<?php

namespace App\Policies;

use App\Models\User;
use App\Models\staffs;
use Illuminate\Auth\Access\Response;

class StaffsPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('staff.view');
    }

    public function view(User $user, staffs $staffs): bool
    {
        return $user->can('staff.view');
    }

    public function create(User $user): bool
    {
        return $user->can('staff.create');
    }

    public function update(User $user, staffs $staffs): bool
    {
        return $user->can('staff.update');
    }

    public function delete(User $user, staffs $staffs): bool
    {
        return $user->can('staff.delete');
    }

    public function restore(User $user, staffs $staffs): bool
    {
        return $user->can('staff.update');
    }

    public function forceDelete(User $user, staffs $staffs): bool
    {
        return $user->can('staff.delete');
    }
}
