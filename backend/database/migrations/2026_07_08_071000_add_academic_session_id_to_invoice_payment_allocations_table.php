<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('invoice_payment_allocations', 'academic_session_id')) {
            Schema::table('invoice_payment_allocations', function (Blueprint $table) {
                $table->foreignUuid('academic_session_id')
                    ->nullable()
                    ->after('invoice_id')
                    ->constrained('academic_sessions')
                    ->nullOnDelete();

                $table->index(['academic_session_id', 'allocated_at'], 'allocations_session_date_idx');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('invoice_payment_allocations', 'academic_session_id')) {
            Schema::table('invoice_payment_allocations', function (Blueprint $table) {
                $table->dropForeign(['academic_session_id']);
                $table->dropIndex('allocations_session_date_idx');
                $table->dropColumn('academic_session_id');
            });
        }
    }
};