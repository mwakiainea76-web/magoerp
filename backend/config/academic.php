<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sessions Per Academic Year
    |--------------------------------------------------------------------------
    |
    | The number of academic sessions (terms) that make up a full academic year.
    | This is used for calculating year-of-study and session-number when
    | enrolling students, and for progress displays.
    |
    */
    'sessions_per_academic_year' => (int) env('SESSIONS_PER_ACADEMIC_YEAR', 3),

    'sessions_per_year_of_study' => (int) env('SESSIONS_PER_YEAR_OF_STUDY', 3),

    'fee_issuance_type' => env('FEE_ISSUANCE_TYPE', 'per_session'),

];
