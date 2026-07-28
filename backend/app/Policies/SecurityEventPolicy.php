<?php

namespace App\Policies;

use App\Models\User;

class SecurityEventPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('security.view');
    }

    public function view(User $user): bool
    {
        return $user->can('security.view');
    }

    public function resolve(User $user): bool
    {
        return $user->can('security.manage');
    }
}
