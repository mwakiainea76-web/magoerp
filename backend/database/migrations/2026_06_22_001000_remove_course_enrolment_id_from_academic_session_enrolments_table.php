<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('academic_session_enrolments', 'course_enrolment_id')) {
            return;
        }

        Schema::table('academic_session_enrolments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('course_enrolment_id');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('academic_session_enrolments', 'course_enrolment_id')) {
            return;
        }

        Schema::table('academic_session_enrolments', function (Blueprint $table) {
            $table->foreignUuid('course_enrolment_id')
                ->nullable()
                ->after('academic_session_id')
                ->constrained('course_enrolments')
                ->nullOnDelete();
        });
    }
};
