<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_unit_registrations', function (Blueprint $table) {
            if (!Schema::hasColumn('student_unit_registrations', 'academic_session_id')) {
                $table->foreignUuid('academic_session_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('academic_sessions')
                    ->cascadeOnDelete();
            }

            if (!Schema::hasColumn('student_unit_registrations', 'student_id')) {
                $table->foreignUuid('student_id')
                    ->nullable()
                    ->after('academic_session_id')
                    ->constrained('students')
                    ->cascadeOnDelete();
            }
        });

        DB::statement("
            UPDATE student_unit_registrations
            SET academic_session_id = (
                SELECT academic_session_enrolments.academic_session_id
                FROM academic_session_enrolments
                WHERE academic_session_enrolments.id = student_unit_registrations.academic_session_enrolment_id
            ),
            student_id = (
                SELECT academic_session_enrolments.student_id
                FROM academic_session_enrolments
                WHERE academic_session_enrolments.id = student_unit_registrations.academic_session_enrolment_id
            )
            WHERE academic_session_id IS NULL OR student_id IS NULL
        ");



        Schema::table('student_marks', function (Blueprint $table) {
            if (!Schema::hasColumn('student_marks', 'score')) {
                $table->unsignedInteger('score')->nullable()->after('assessment_number');
            }
        });

        DB::table('student_marks')
            ->whereNull('score')
            ->update(['score' => DB::raw('marks')]);
    }

    public function down(): void
    {
        Schema::table('student_marks', function (Blueprint $table) {
            if (Schema::hasColumn('student_marks', 'score')) {
                $table->dropColumn('score');
            }
        });
    }
};
