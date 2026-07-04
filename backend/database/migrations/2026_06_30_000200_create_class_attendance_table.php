<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_attendances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignUuid('unit_enrolment_id')->constrained('student_unit_registrations')->cascadeOnDelete();
            $table->foreignUuid('trainer_id')->constrained('users')->cascadeOnDelete();
            $table->date('session_date');
            $table->time('start_time');
            $table->string('status');
            $table->text('remarks')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->unique(['unit_enrolment_id', 'session_date', 'start_time'], 'class_attendance_unique');
            $table->index(['unit_id', 'session_date', 'start_time'], 'class_attendance_meeting_idx');
            $table->index(['trainer_id', 'session_date'], 'class_attendance_trainer_date_idx');
            $table->index(['unit_id', 'status', 'session_date'], 'class_attendance_unit_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_attendances');
    }
};