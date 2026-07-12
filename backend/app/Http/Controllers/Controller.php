<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use Illuminate\Support\Facades\Storage;

abstract class Controller
{
    protected function loadInstitution(): array
    {
        $institution = Institution::where('is_active', true)->first() ?? Institution::first();

        if (! $institution) {
            return [];
        }

        $data = $institution->toArray();
        $data['logo_path'] = $institution->logo
            ? Storage::disk('public')->path($institution->logo)
            : null;
        $data['logo_url'] = $institution->logo
            ? request()->getSchemeAndHttpHost() . '/storage/' . $institution->logo
            : null;

        return $data;
    }
}
