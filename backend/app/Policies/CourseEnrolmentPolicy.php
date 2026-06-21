<?php

namespace App\Policies;

use App\Models\User;
use App\Models\CourseEnrolment;

class CourseEnrolmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('enrolments.view');
    }

    public function view(User $user, CourseEnrolment $enrolment): bool
    {
        return $user->can('enrolments.view');
    }

    public function create(User $user): bool
    {
        return $user->can('enrolments.create');
    }

    public function update(User $user, CourseEnrolment $enrolment): bool
    {
        return $user->can('enrolments.update');
    }

    public function delete(User $user, CourseEnrolment $enrolment): bool
    {
        return $user->can('enrolments.delete');
    }
}
