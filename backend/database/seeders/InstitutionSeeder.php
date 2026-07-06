<?php

namespace Database\Seeders;

use App\Models\Institution;
use Illuminate\Database\Seeder;

class InstitutionSeeder extends Seeder
{
    public function run(): void
    {
        Institution::updateOrCreate(
            ['code' => env('INSTITUTION_CODE', 'MAGO')],
            [
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
            ]
        );
    }
}
