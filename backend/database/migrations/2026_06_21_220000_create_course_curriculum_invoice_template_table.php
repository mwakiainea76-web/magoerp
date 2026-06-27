<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_curriculum_invoice_template', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_curriculum_id')->nullable()->constrained('course_curricula')->nullOnDelete();
            $table->foreignUuid('invoice_template_id')->constrained('invoice_templates')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->integer('year_level');
            $table->integer('session_number');
            $table->boolean('is_approved')->default(false);
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_curriculum_invoice_template');
    }
};
