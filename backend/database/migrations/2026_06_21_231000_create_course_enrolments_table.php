<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_enrolments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('course_curriculum_id')->constrained('course_curricula')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->date('enrolment_date');
            $table->string('status', 50)->default('enrolled');
            $table->text('remarks')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['student_id', 'course_curriculum_id'], 'course_enrolments_student_curriculum_unique');
            $table->index(['status', 'deleted_at', 'created_at'], 'course_enrolments_status_created_idx');
            $table->index(['course_curriculum_id', 'status'], 'course_enrolments_curriculum_status_idx');
            $table->index(['academic_session_id', 'status'], 'course_enrolments_session_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_enrolments');
    }
};
