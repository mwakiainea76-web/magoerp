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
        SystemConfiguration::updateOrCreate(
            ['key' => 'sessions_per_full_year'],
            [
                'value' => '3',
                'label' => 'Sessions per Full Academic Year',
                'type' => 'integer',
            ]
        );
    }
}
