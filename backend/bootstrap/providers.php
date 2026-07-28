<?php

use App\Providers\AppServiceProvider;
use Barryvdh\DomPDF\ServiceProvider as DomPdfServiceProvider;
use Resend\Laravel\ResendServiceProvider;

return [
    AppServiceProvider::class,
    DomPdfServiceProvider::class,
    ResendServiceProvider::class,
];