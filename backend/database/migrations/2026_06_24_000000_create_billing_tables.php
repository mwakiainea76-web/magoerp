<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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

        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('invoice_number')->unique();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->string('invoice_type', 50)->default('fees');
            $table->string('status', 50)->default('issued');
            $table->date('issue_date');
            $table->date('due_date');
            $table->decimal('amount_due', 10, 2)->default(0);
            $table->string('idempotency_key')->nullable()->unique();
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('due_date');
            $table->index(['student_id', 'academic_session_id']);
            $table->index(['student_id', 'status']);
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignUuid('invoice_template_item_id')->nullable()->constrained('invoice_template_items')->nullOnDelete();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->integer('quantity')->default(1);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->json('snapshot_data')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->decimal('amount', 10, 2);
            $table->date('payment_date');
            $table->string('method', 50)->nullable();
            $table->string('reference', 100)->nullable();
            $table->string('status', 50)->default('completed');
            $table->string('idempotency_key')->nullable()->unique();
            $table->foreignUuid('created_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('payment_date');
            $table->index('status');
        });

        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->date('allocated_at')->nullable();
            $table->timestamps();

            $table->index(['payment_id', 'invoice_id']);
        });

        DB::statement('ALTER TABLE payment_allocations ADD CONSTRAINT payment_allocations_amount_check CHECK (amount > 0)');

        Schema::create('invoice_adjustments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('type', 50);
            $table->decimal('amount', 10, 2);
            $table->string('idempotency_key')->nullable()->unique();
            $table->text('description')->nullable();
            $table->date('applied_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->timestamps();

            $table->index('type');
        });

        Schema::create('ledger_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignUuid('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->string('type', 50);
            $table->decimal('debit', 12, 2)->default(0);
            $table->decimal('credit', 12, 2)->default(0);
            $table->string('reference', 100)->nullable();
            $table->text('description')->nullable();
            $table->date('transaction_date');
            $table->foreignUuid('created_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['student_id', 'transaction_date']);
            $table->index(['student_id', 'academic_session_id']);
            $table->index('type');
        });

        Schema::create('student_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->decimal('total_invoiced', 10, 2)->default(0);
            $table->decimal('total_paid', 10, 2)->default(0);
            $table->decimal('balance', 10, 2)->default(0);
            $table->timestamp('last_transaction_at')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'academic_session_id']);
            $table->index('student_id');
            $table->index('academic_session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_accounts');
        Schema::dropIfExists('ledger_transactions');
        Schema::dropIfExists('invoice_adjustments');
        Schema::dropIfExists('payment_allocations');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('course_curriculum_invoice_template');
        Schema::dropIfExists('invoice_template_items');
        Schema::dropIfExists('invoice_templates');
    }
};
