<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_session_enrolments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->unsignedTinyInteger('year_of_study')->nullable();
            $table->unsignedTinyInteger('session_number')->nullable();
            $table->unsignedTinyInteger('module')->nullable();
            $table->string('status', 50)->default('ongoing');
            $table->timestamp('enrolled_at')->useCurrent();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'academic_session_id'], 'student_session_unique');
            $table->index(['academic_session_id', 'status', 'enrolled_at'], 'session_enrolments_status_date_idx');
            $table->index(['student_id', 'status', 'created_at'], 'student_enrolments_status_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_session_enrolments');
    }
};
