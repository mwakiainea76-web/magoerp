<?php

namespace App\Console\Commands;

use App\Models\Otp;
use Illuminate\Console\Command;

class CleanupOtps extends Command
{
    protected $signature = 'otp:cleanup {--hours=24 : Delete OTPs older than N hours}';

    protected $description = 'Delete expired and used OTP records older than the specified threshold';

    public function handle(): int
    {
        $hours = (int) $this->option('hours');
        $cutoff = now()->subHours($hours);

        $deleted = Otp::where('created_at', '<', $cutoff)->delete();

        $this->info("Deleted {$deleted} expired OTP record(s) older than {$hours} hours.");

        return self::SUCCESS;
    }
}
