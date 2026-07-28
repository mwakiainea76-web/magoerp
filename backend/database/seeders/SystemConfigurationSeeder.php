<?php

namespace Database\Seeders;

use App\Models\SystemConfiguration;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SystemConfigurationSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        SystemConfiguration::where('key', 'sessions_per_academic_year')->delete();

        SystemConfiguration::updateOrCreate(
            ['key' => 'sessions_per_year_of_study'],
            [
                'value' => (string) config('academic.sessions_per_year_of_study', 3),
                'label' => 'Sessions per Year of Study',
                'type' => 'integer',
            ]
        );

        SystemConfiguration::updateOrCreate(
            ['key' => 'fee_issuance_type'],
            [
                'value' => config('academic.fee_issuance_type', 'per_session'),
                'label' => 'Fee Issuance Type',
                'type' => 'select',
            ]
        );

        SystemConfiguration::updateOrCreate(
            ['key' => 'mfa_required_roles'],
            [
                'value' => 'finance',
                'label' => 'Roles Requiring MFA on Login',
                'type' => 'multi_select',
            ]
        );
    }
}
