<?php

namespace App\Policies;

use App\Models\User;

class SecuritySessionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('security.view');
    }

    public function view(User $user): bool
    {
        return $user->can('security.view');
    }

    public function delete(User $user): bool
    {
        return $user->can('security.manage');
    }
}
