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

        DB::table('student_unit_registrations')
            ->join('academic_session_enrolments', 'student_unit_registrations.academic_session_enrolment_id', '=', 'academic_session_enrolments.id')
            ->whereNull('student_unit_registrations.academic_session_id')
            ->orWhereNull('student_unit_registrations.student_id')
            ->update([
                'student_unit_registrations.academic_session_id' => DB::raw('academic_session_enrolments.academic_session_id'),
                'student_unit_registrations.student_id' => DB::raw('academic_session_enrolments.student_id'),
            ]);

        Schema::table('student_unit_registrations', function (Blueprint $table) {
            if (Schema::hasColumn('student_unit_registrations', 'academic_session_id')) {
                $table->uuid('academic_session_id')->nullable(false)->change();
            }

            if (Schema::hasColumn('student_unit_registrations', 'student_id')) {
                $table->uuid('student_id')->nullable(false)->change();
            }
        });

        Schema::table('student_marks', function (Blueprint $table) {
            if (!Schema::hasColumn('student_marks', 'score')) {
                $table->unsignedInteger('score')->nullable()->after('assessment_number');
            }
        });

        DB::table('student_marks')
            ->whereNull('score')
            ->update(['score' => DB::raw('marks')]);

        Schema::table('student_marks', function (Blueprint $table) {
            if (Schema::hasColumn('student_marks', 'score')) {
                $table->unsignedInteger('score')->nullable(false)->change();
            }
        });
    }

    public function down(): void
    {
        Schema::table('student_marks', function (Blueprint $table) {
            if (Schema::hasColumn('student_marks', 'score')) {
                $table->dropColumn('score');
            }
        });

        Schema::table('student_unit_registrations', function (Blueprint $table) {
            if (Schema::hasColumn('student_unit_registrations', 'student_id')) {
                $table->dropConstrainedForeignId('student_id');
            }

            if (Schema::hasColumn('student_unit_registrations', 'academic_session_id')) {
                $table->dropConstrainedForeignId('academic_session_id');
            }
        });
    }
};
