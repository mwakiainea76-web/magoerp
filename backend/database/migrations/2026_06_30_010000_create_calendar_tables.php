<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_event_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('label', 255);
            $table->string('color_hex', 7)->default('#3b82f6');
            $table->timestamps();
        });

        Schema::create('calendar_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->foreignUuid('event_type_id')->constrained('calendar_event_types')->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('source', 50)->default('manual');
            $table->boolean('is_locked')->default(false);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->index(['academic_session_id', 'start_date']);
            $table->index(['academic_session_id', 'event_type_id']);
            $table->index(['event_type_id', 'start_date'], 'calendar_events_type_date_idx');
            $table->index(['academic_session_id', 'end_date'], 'calendar_events_session_end_idx');
        });

        Schema::create('holiday_sync_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('year');
            $table->string('country_code', 5)->default('KE');
            $table->timestamp('synced_at')->nullable();
            $table->json('raw_response')->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->unique(['country_code', 'year'], 'holiday_sync_country_year_unique');
            $table->index(['status', 'synced_at'], 'holiday_sync_status_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holiday_sync_logs');
        Schema::dropIfExists('calendar_events');
        Schema::dropIfExists('calendar_event_types');
    }
};