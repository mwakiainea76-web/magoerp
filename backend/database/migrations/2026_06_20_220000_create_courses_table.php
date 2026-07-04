<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('initials', 20);
            $table->string('name', 255);
            $table->unsignedSmallInteger('duration_months')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('certification_authority_id')->nullable()->constrained('certification_authorities')->nullOnDelete();
            $table->foreignUuid('certification_level_id')->nullable()->constrained('certification_levels')->nullOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->index(['department_id', 'is_active', 'name'], 'courses_department_active_name_idx');
            $table->index(['certification_authority_id', 'certification_level_id', 'is_active'], 'courses_authority_level_active_idx');
            $table->index(['is_active', 'name'], 'courses_active_name_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
