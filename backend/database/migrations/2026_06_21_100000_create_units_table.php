<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_curriculum_id')
                ->constrained('course_curricula')
                ->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('modules_taught')->nullable();
            $table->unsignedTinyInteger('year_of_study')->nullable();
            $table->unsignedTinyInteger('session_number')->nullable();
            $table->unsignedSmallInteger('taught_hours')->nullable();
            $table->unsignedSmallInteger('credit_factor')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->unique(['course_curriculum_id', 'code']);
            $table->index(
                ['course_curriculum_id', 'is_active', 'modules_taught', 'year_of_study', 'session_number'],
                'units_curriculum_delivery_idx',
            );
            $table->index(['is_active', 'name'], 'units_active_name_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
