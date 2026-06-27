<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->boolean('is_issued')->default(false);
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('invoice_template_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_template_id')->constrained('invoice_templates')->cascadeOnDelete();
            $table->string('name', 255);
            $table->decimal('amount', 12, 2);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_template_items');
        Schema::dropIfExists('invoice_templates');
    }
};
