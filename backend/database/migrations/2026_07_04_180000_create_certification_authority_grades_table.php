<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certification_authority_grades', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('certification_authority_id');
            $table->string('grade', 50);
            $table->decimal('grade_start', 5, 2);
            $table->decimal('grade_end', 5, 2);
            $table->text('remark')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('certification_authority_id', 'ca_grade_auth_fk')
                ->references('id')->on('certification_authorities')->cascadeOnDelete();
            $table->foreign('created_by', 'ca_grade_cb_fk')
                ->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by', 'ca_grade_ub_fk')
                ->references('id')->on('users')->nullOnDelete();
            $table->unique(['certification_authority_id', 'grade'], 'ca_grade_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certification_authority_grades');
    }
};
