<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')
                ->constrained('students')
                ->cascadeOnDelete();
            $table->string('subject', 200);
            $table->text('description');
            $table->enum('status', ['pending', 'in_review', 'escalated', 'resolved'])
                ->default('pending');
            $table->foreignUuid('escalated_to')
                ->nullable()
                ->constrained('staffs')
                ->nullOnDelete();
            $table->timestamp('escalated_at')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
