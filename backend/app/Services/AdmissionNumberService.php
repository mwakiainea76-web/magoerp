<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\CourseEnrolment;
use Illuminate\Support\Str;

class AdmissionNumberService
{
    public function generateForCourse(Course $course): string
    {
        $academicYear = AcademicYear::query()
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->first()
            ?? AcademicYear::query()->orderByDesc('start_date')->first();

        $count = CourseEnrolment::query()
            ->whereHas('courseCurriculum', fn ($q) => $q->where('course_id', $course->id))
            ->whereHas('student', fn ($q) => $q->withTrashed())
            ->count();

        $initials = Str::upper((string) preg_replace(
            '/[^A-Za-z0-9]/',
            '',
            $course->initials ?: $course->code,
        ));
        $initials = $initials !== '' ? $initials : 'STU';
        $sequence = str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
        $intakeYear = $academicYear?->start_date?->format('y') ?? now()->format('y');

        return "{$initials}/{$sequence}/{$intakeYear}";
    }
}
