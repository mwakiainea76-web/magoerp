<?php

use App\Models\SystemConfiguration;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Rename sessions_per_full_year → sessions_per_academic_year
        SystemConfiguration::where('key', 'sessions_per_full_year')
            ->update(['key' => 'sessions_per_academic_year', 'label' => 'Sessions per Academic Year']);

        // Remove billing_period — it was only used for an idempotency-key branch
        // that never should have been 'annual' (fees have always been per-session).
        SystemConfiguration::where('key', 'billing_period')->delete();
    }

    public function down(): void
    {
        SystemConfiguration::where('key', 'sessions_per_academic_year')
            ->update(['key' => 'sessions_per_full_year', 'label' => 'Sessions per Full Academic Year']);

        SystemConfiguration::updateOrCreate(
            ['key' => 'billing_period'],
            ['value' => 'session', 'label' => 'Billing Period (session or annual)', 'type' => 'string'],
        );
    }
};
