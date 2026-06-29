<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hostels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->decimal('session_fee_amount', 12, 2)->default(0);
            $table->string('gender')->nullable(); // male, female, mixed
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['is_active', 'name']);
        });

        Schema::create('hostel_rooms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hostel_id')->constrained('hostels')->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('floor')->nullable();
            $table->unsignedInteger('bed_count')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['hostel_id', 'is_active']);
        });

        Schema::create('hostel_beds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hostel_room_id')->constrained('hostel_rooms')->cascadeOnDelete();
            $table->unsignedInteger('bed_number');
            $table->string('label');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['hostel_room_id', 'bed_number']);
            $table->index(['hostel_room_id', 'is_active']);
        });

        Schema::create('hostel_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('academic_session_enrolment_id')
                ->constrained('academic_session_enrolments')
                ->cascadeOnDelete();
            $table->foreignUuid('hostel_room_id')->constrained('hostel_rooms')->cascadeOnDelete();
            $table->foreignUuid('hostel_bed_id')->constrained('hostel_beds')->cascadeOnDelete();
            $table->decimal('hostel_fee_amount', 12, 2)->default(0);
            $table->date('allocated_on');
            $table->enum('status', ['active', 'vacated'])->default('active');
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['academic_session_enrolment_id', 'hostel_bed_id'], 'ha_ase_id_hb_id_unique');
            $table->index(['academic_session_enrolment_id', 'status'], 'ha_ase_id_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hostel_allocations');
        Schema::dropIfExists('hostel_beds');
        Schema::dropIfExists('hostel_rooms');
        Schema::dropIfExists('hostels');
    }
};
