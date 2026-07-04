<?php

namespace App\Providers;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->bootSchedule();
    }

    /**
     * Bootstrap the schedule.
     */
    protected function bootSchedule(): void
    {
        $this->callAfterResolving(Schedule::class, function (Schedule $schedule) {
            $schedule->command('finance:reconcile')
                ->daily()
                ->at('02:00')
                ->withoutOverlapping()
                ->onFailure(function () {
                    // Log or notify on reconciliation failure
                });
        });
    }
}
