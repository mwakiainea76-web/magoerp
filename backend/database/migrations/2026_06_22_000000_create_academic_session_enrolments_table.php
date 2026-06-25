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
            $table->string('status', 50)->default('enrolled');
            $table->timestamp('enrolled_at')->useCurrent();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['student_id', 'academic_session_id'], 'student_session_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_session_enrolments');
    }
};
