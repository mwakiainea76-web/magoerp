<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lecture_rooms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('code')->unique();
            $table->unsignedInteger('capacity')->nullable();
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('academic_timetables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('academic_session_id')
                ->constrained('academic_sessions')
                ->cascadeOnDelete();
            $table->foreignUuid('unit_id')
                ->constrained('units')
                ->cascadeOnDelete();
            $table->foreignUuid('trainer_staff_id')
                ->nullable()
                ->constrained('staffs')
                ->nullOnDelete();
            $table->foreignUuid('lecture_room_id')
                ->nullable()
                ->constrained('lecture_rooms')
                ->nullOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0=Mon .. 6=Sun
            $table->time('start_time');
            $table->time('end_time');
            $table->string('type')->default('lecture'); // lecture, practical, tutorial, etc.
            $table->string('recurrence')->default('weekly'); // weekly, once
            $table->date('date')->nullable(); // specific date for one-off sessions
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignUuid('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['academic_session_id', 'day_of_week']);
            $table->index(['trainer_staff_id']);
            $table->index(['lecture_room_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_timetables');
        Schema::dropIfExists('lecture_rooms');
    }
};
