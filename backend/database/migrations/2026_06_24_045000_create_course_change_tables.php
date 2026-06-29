<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('curriculum_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('from_curriculum_mapping_id')->constrained('course_curricula');
            $table->foreignUuid('to_curriculum_mapping_id')->constrained('course_curricula');
            $table->date('transfer_date');
            $table->text('reason')->nullable();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('student_id');
            $table->index('transfer_date');
        });

        Schema::create('course_change_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('old_admission_number', 50)->nullable();
            $table->string('new_admission_number', 50)->nullable();
            $table->foreignUuid('old_course_curriculum_id')->nullable()->constrained('course_curricula')->nullOnDelete();
            $table->foreignUuid('new_course_curriculum_id')->nullable()->constrained('course_curricula')->nullOnDelete();
            $table->string('old_status', 50)->nullable();
            $table->string('new_status', 50)->nullable();
            $table->foreignUuid('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('changed_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('student_id');
            $table->index('changed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_change_logs');
        Schema::dropIfExists('curriculum_transfers');
    }
};
