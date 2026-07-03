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

];
