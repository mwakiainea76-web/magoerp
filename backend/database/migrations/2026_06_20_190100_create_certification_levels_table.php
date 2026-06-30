<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certification_levels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('certification_authority_id')
                ->constrained('certification_authorities', indexName: 'cert_levels_authority_foreign')
                ->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 100);
            $table->string('entry_grade', 100)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['certification_authority_id', 'code'], 'cert_levels_authority_code_unique');
            $table->unique(['certification_authority_id', 'name'], 'cert_levels_authority_name_unique');
            $table->index(['certification_authority_id', 'name'], 'cert_levels_authority_name_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certification_levels');
    }
};
