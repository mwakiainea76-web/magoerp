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
            $table->foreignUuid('course_curriculum_id')->constrained('course_curricula')->cascadeOnDelete();
            $table->foreignUuid('invoice_template_id')->constrained('invoice_templates')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_curriculum_invoice_template');
    }
};
