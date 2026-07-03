<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_assignment_audits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('curriculum_fee_assignment_id');
            $table->uuid('modified_by')->nullable();
            $table->string('field', 50);
            $table->decimal('old_value', 12, 2)->nullable();
            $table->decimal('new_value', 12, 2)->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->foreign('curriculum_fee_assignment_id')
                ->references('id')->on('curriculum_fee_assignments')
                ->cascadeOnDelete();

            $table->foreign('modified_by')
                ->references('id')->on('users')
                ->nullOnDelete();

            $table->index(
                ['curriculum_fee_assignment_id', 'created_at'],
                'fee_assignment_audits_assignment_date_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_assignment_audits');
    }
};
