<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_timetable_id')->constrained('academic_timetables')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->date('attendance_date');
            $table->enum('status', ['present', 'absent', 'late', 'excused'])->default('present');
            $table->text('remarks')->nullable();
            $table->foreignId('marked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['academic_timetable_id', 'student_id', 'attendance_date'], 'attendance_unique');
            $table->index(['student_id', 'attendance_date']);
            $table->index(['academic_timetable_id', 'attendance_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};