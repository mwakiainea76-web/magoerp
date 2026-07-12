<?php

namespace Database\Seeders;

use App\Models\Institution;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class InstitutionSeeder extends Seeder
{
    public function run(): void
    {
        $defaultLogoPath = 'logos/default-logo.svg';
        $logoDisk = Storage::disk('public');

        if (!$logoDisk->exists($defaultLogoPath)) {
            $sourcePath = __DIR__ . '/assets/default-logo.svg';
            if (file_exists($sourcePath)) {
                $logoDisk->put($defaultLogoPath, file_get_contents($sourcePath));
            }
        }

        $institution = Institution::first();

        if ($institution) {
            $data = [
                'postal_address' => env('INSTITUTION_POSTAL_ADDRESS'),
                'telephone' => env('INSTITUTION_TELEPHONE'),
                'email' => env('INSTITUTION_EMAIL'),
                'website' => env('INSTITUTION_WEBSITE'),
                'facebook' => env('INSTITUTION_FACEBOOK'),
                'twitter' => env('INSTITUTION_TWITTER'),
                'instagram' => env('INSTITUTION_INSTAGRAM'),
                'linkedin' => env('INSTITUTION_LINKEDIN'),
                'youtube' => env('INSTITUTION_YOUTUBE'),
            ];

            $data = array_filter($data, fn ($v) => $v !== null);

            if ($logoDisk->exists($defaultLogoPath)) {
                $data['logo'] = $defaultLogoPath;
            }

            $institution->update($data);
        } else {
            Institution::create([
                'code' => env('INSTITUTION_CODE', 'MAGO'),
                'name' => env('INSTITUTION_NAME', env('APP_NAME', 'Mago ERP')),
                'postal_address' => env('INSTITUTION_POSTAL_ADDRESS'),
                'telephone' => env('INSTITUTION_TELEPHONE'),
                'email' => env('INSTITUTION_EMAIL'),
                'website' => env('INSTITUTION_WEBSITE'),
                'facebook' => env('INSTITUTION_FACEBOOK'),
                'twitter' => env('INSTITUTION_TWITTER'),
                'instagram' => env('INSTITUTION_INSTAGRAM'),
                'linkedin' => env('INSTITUTION_LINKEDIN'),
                'youtube' => env('INSTITUTION_YOUTUBE'),
                'is_active' => true,
                'logo' => $logoDisk->exists($defaultLogoPath) ? $defaultLogoPath : null,
            ]);
        }
    }
}
