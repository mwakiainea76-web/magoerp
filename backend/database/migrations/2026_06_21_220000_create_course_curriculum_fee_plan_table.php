<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_curriculum_fee_plan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_curriculum_id')->constrained('course_curricula')->cascadeOnDelete();
            $table->foreignUuid('fee_plan_id')->constrained('fee_plans')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['course_curriculum_id', 'academic_session_id'], 'cc_session_fee_plan_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_curriculum_fee_plan');
    }
};
