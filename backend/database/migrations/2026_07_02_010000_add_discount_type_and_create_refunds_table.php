<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('refunds')) {
            Schema::create('refunds', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('student_id')->constrained()->cascadeOnDelete();
                $table->foreignUuid('invoice_id')->nullable()->constrained()->nullOnDelete();
                $table->decimal('amount', 10, 2);
                $table->string('reason', 500)->nullable();
                $table->string('status', 20)->default('processed');
                $table->foreignUuid('processed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();

                $table->index(['student_id', 'status', 'processed_at'], 'refunds_student_status_date_idx');
                $table->index(['invoice_id', 'status'], 'refunds_invoice_status_idx');
                $table->index(['status', 'processed_at'], 'refunds_status_date_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};