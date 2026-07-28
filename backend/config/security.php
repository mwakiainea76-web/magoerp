<?php

return [

    'rate_limits' => [
        'login' => [5, 1],
        'password_reset' => [3, 5],
        'otp' => [5, 1],
        'api' => [100, 1],
        'exports' => [10, 5],
        'search' => [60, 1],
        'uploads' => [10, 1],
    ],

    'risk' => [
        'decay_hours' => 24,
        'decay_points' => 5,
    ],

    'session' => [
        'fresh_auth_ttl_minutes' => 15,
    ],

    'device' => [
        'cookie_name' => 'magoerp_device_uuid',
        'cookie_ttl_years' => 5,
    ],

];
