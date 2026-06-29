<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_unit_registrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('academic_session_enrolment_id')
                ->constrained('academic_session_enrolments')
                ->cascadeOnDelete();
            $table->foreignUuid('unit_id')
                ->constrained('units')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['academic_session_enrolment_id', 'unit_id'], 'stu_reg_unique');
        });

        Schema::create('student_marks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('academic_session_enrolment_id')
                ->constrained('academic_session_enrolments')
                ->cascadeOnDelete();
            $table->foreignUuid('unit_id')
                ->constrained('units')
                ->cascadeOnDelete();
            $table->string('assessment_type', 50);
            $table->unsignedInteger('assessment_number');
            $table->unsignedInteger('score');
            $table->unsignedInteger('marks');
            $table->boolean('is_published')->default(false);
            $table->foreignUuid('recorded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(['academic_session_enrolment_id', 'unit_id', 'assessment_type', 'assessment_number'], 'marks_unique_assessment');
            $table->index(['academic_session_enrolment_id']);
            $table->index(['unit_id', 'assessment_type', 'assessment_number', 'academic_session_enrolment_id'], 'marks_lookup_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_marks');
        Schema::dropIfExists('student_unit_registrations');
    }
};
