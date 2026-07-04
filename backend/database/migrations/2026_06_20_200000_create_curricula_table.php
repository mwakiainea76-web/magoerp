<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('curricula', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->foreignUuid('certification_authority_id')->nullable()->constrained('certification_authorities')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->index(['certification_authority_id', 'is_active', 'name'], 'curricula_authority_active_name_idx');
            $table->index(['is_active', 'name'], 'curricula_active_name_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('curricula');
    }
};
