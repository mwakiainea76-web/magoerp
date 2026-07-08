<?php

namespace App\Http\Controllers;

use App\Models\Institution;

abstract class Controller
{
    protected function loadInstitution(): array
    {
        $institution = Institution::where('is_active', true)->first() ?? Institution::first();

        return $institution ? $institution->toArray() : [];
    }
}
