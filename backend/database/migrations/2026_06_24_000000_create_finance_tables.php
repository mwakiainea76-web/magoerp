<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->string('type', 50)->default('fees');
            $table->text('description')->nullable();
            $table->boolean('is_issued')->default(false);
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'created_at'], 'fee_templates_active_created_idx');
        });

        Schema::create('fee_template_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('fee_template_id')->constrained('fee_templates')->cascadeOnDelete();
            $table->string('name', 255);
            $table->decimal('amount', 12, 2);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->index(['fee_template_id', 'is_active']);
        });

        Schema::create('curriculum_fee_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_curriculum_id')->nullable()->constrained('course_curricula')->nullOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignUuid('fee_template_id')->constrained('fee_templates')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->string('issuance_type', 20)->default('per_session');
            $table->foreignUuid('parent_assignment_id')->nullable()->constrained('curriculum_fee_assignments')->cascadeOnDelete();
            $table->boolean('dormant')->default(false);
            $table->decimal('split_amount', 12, 2)->nullable();
            $table->decimal('split_ratio', 5, 2)->nullable();
            $table->unsignedTinyInteger('year_level')->comment('0 applies to all course years; otherwise 1-4');
            $table->integer('session_number');
            $table->boolean('is_approved')->default(false);
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->unique(['course_curriculum_id', 'academic_session_id', 'year_level', 'session_number'], 'curriculum_fee_assignment_unique');
            $table->unique(['department_id', 'academic_session_id', 'year_level', 'session_number'], 'department_fee_assignment_unique');
            $table->index(['fee_template_id', 'parent_assignment_id', 'year_level', 'session_number'], 'fee_assignment_template_list_idx');
            $table->index(['parent_assignment_id', 'dormant', 'session_number'], 'fee_assignment_parent_dormant_idx');
            $table->index(
                ['course_curriculum_id', 'year_level', 'issuance_type', 'is_approved', 'dormant', 'academic_session_id'],
                'fee_assignment_billing_scope_idx',
            );
            $table->index(
                ['department_id', 'year_level', 'issuance_type', 'is_approved', 'dormant', 'academic_session_id'],
                'department_fee_assignment_scope_idx',
            );
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('invoice_number')->unique();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->foreignUuid('course_curriculum_id')->nullable()->constrained('course_curricula')->nullOnDelete();
            $table->foreignUuid('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignUuid('fee_template_id')->nullable()->constrained('fee_templates')->nullOnDelete();
            $table->string('invoice_type', 50)->default('fees');
            $table->string('status', 50)->default('issued');
            $table->date('issue_date');
            $table->date('due_date');
            $table->decimal('amount_due', 10, 2)->default(0);
            $table->decimal('computed_amount', 10, 2)
                ->default(0)
                ->comment('Sum of invoice_line_items.total_amount; must match amount_due');
            $table->string('idempotency_key')->nullable()->unique();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('due_date');
            $table->index(['student_id', 'academic_session_id']);
            $table->index(['student_id', 'status', 'issue_date'], 'invoices_student_status_date_idx');
            $table->index(['academic_session_id', 'status'], 'invoices_session_status_idx');
            $table->index(['department_id', 'academic_session_id', 'status'], 'invoices_department_session_status_idx');
            $table->index(['course_id', 'academic_session_id', 'status'], 'invoices_course_session_status_idx');
            $table->index(['fee_template_id', 'academic_session_id', 'status'], 'invoices_template_session_status_idx');
        });

        Schema::create('invoice_line_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignUuid('fee_template_item_id')->nullable()->constrained('fee_template_items')->nullOnDelete();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->integer('quantity')->default(1);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->json('snapshot_data')->nullable();
            $table->timestamps();

            $table->index(['invoice_id', 'fee_template_item_id'], 'invoice_items_invoice_template_idx');
            $table->index(['fee_template_item_id', 'created_at'], 'invoice_items_template_date_idx');
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
            $table->uuid('created_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('payment_date');
            $table->index('status');
            $table->index(['student_id', 'status', 'payment_date'], 'payments_student_status_date_idx');
            $table->index(['status', 'payment_date'], 'payments_status_date_idx');
        });

        Schema::create('invoice_payment_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->date('allocated_at')->nullable();
            $table->timestamps();

            $table->index(['payment_id', 'invoice_id']);
            $table->index(['invoice_id', 'payment_id']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE invoice_payment_allocations ADD CONSTRAINT invoice_payment_allocations_amount_check CHECK (amount > 0)');
        }

        Schema::create('student_fee_adjustments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('type', 50);
            $table->string('discount_type', 20)->nullable();
            $table->decimal('discount_percentage', 5, 2)->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('idempotency_key')->nullable()->unique();
            $table->text('description')->nullable();
            $table->date('applied_at')->nullable();
            $table->boolean('ledger_posted')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('type');
            $table->index(['invoice_id', 'deleted_at', 'type'], 'fee_adjustments_invoice_active_type_idx');
            $table->index(['type', 'applied_at', 'deleted_at'], 'fee_adjustments_type_date_idx');
        });

        Schema::create('student_ledger_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignUuid('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignUuid('adjustment_id')->nullable()->constrained('student_fee_adjustments')->nullOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->string('type', 50);
            $table->decimal('debit', 12, 2)->default(0);
            $table->decimal('credit', 12, 2)->default(0);
            $table->string('reference', 100)->nullable();
            $table->text('description')->nullable();
            $table->date('transaction_date');
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'transaction_date']);
            $table->index(['student_id', 'academic_session_id', 'transaction_date'], 'ledger_student_session_date_idx');
            $table->index(['payment_id', 'type', 'created_at'], 'ledger_payment_type_date_idx');
            $table->index('type');
        });

        Schema::create('student_account_balances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->decimal('total_invoiced', 10, 2)->default(0);
            $table->decimal('total_paid', 10, 2)->default(0);
            $table->decimal('total_adjustments', 10, 2)->default(0);
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
        Schema::dropIfExists('student_account_balances');
        Schema::dropIfExists('student_ledger_entries');
        Schema::dropIfExists('student_fee_adjustments');
        Schema::dropIfExists('invoice_payment_allocations');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_line_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('curriculum_fee_assignments');
        Schema::dropIfExists('fee_template_items');
        Schema::dropIfExists('fee_templates');
    }
};
