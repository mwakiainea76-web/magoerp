<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('payments', 'academic_session_id')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->foreignUuid('academic_session_id')
                    ->nullable()
                    ->after('student_id')
                    ->constrained('academic_sessions')
                    ->nullOnDelete();

                $table->index(['academic_session_id', 'status', 'payment_date'], 'payments_session_status_date_idx');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('payments', 'academic_session_id')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropForeign(['academic_session_id']);
                $table->dropIndex('payments_session_status_date_idx');
                $table->dropColumn('academic_session_id');
            });
        }
    }
};