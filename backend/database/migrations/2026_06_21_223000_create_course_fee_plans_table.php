<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('course_curriculum_fee_plan');

        Schema::create('course_fee_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('fee_plan_id')->constrained('fee_plans')->cascadeOnDelete();
            $table->unsignedTinyInteger('year_level');
            $table->unsignedTinyInteger('session_number');
            $table->boolean('is_approved')->default(false);
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['course_id', 'year_level', 'session_number'], 'course_year_session_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_fee_plans');
    }
};
