<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\Student;
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

        $students = Student::withTrashed()->where('course_id', $course->id);

        if ($academicYear?->start_date && $academicYear?->end_date) {
            $students->whereBetween('enrollment_date', [
                $academicYear->start_date->toDateString(),
                $academicYear->end_date->toDateString(),
            ]);
        } elseif ($academicYear?->start_date) {
            $students->whereDate('enrollment_date', '>=', $academicYear->start_date->toDateString());
        } elseif ($academicYear?->end_date) {
            $students->whereDate('enrollment_date', '<=', $academicYear->end_date->toDateString());
        } else {
            $students->whereYear('enrollment_date', now()->year);
        }

        $initials = Str::upper((string) preg_replace(
            '/[^A-Za-z0-9]/',
            '',
            $course->initials ?: $course->code,
        ));
        $initials = $initials !== '' ? $initials : 'STU';
        $sequence = str_pad((string) ($students->count() + 1), 4, '0', STR_PAD_LEFT);
        $intakeYear = $academicYear?->start_date?->format('y') ?? now()->format('y');

        return "{$initials}/{$sequence}/{$intakeYear}";
    }
}
