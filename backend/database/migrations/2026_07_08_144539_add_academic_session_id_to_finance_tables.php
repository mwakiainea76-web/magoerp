<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_fee_adjustments', function (Blueprint $table) {
            $table->foreignUuid('academic_session_id')->nullable()->after('invoice_id')->constrained('academic_sessions')->nullOnDelete();
        });

        Schema::table('refunds', function (Blueprint $table) {
            $table->foreignUuid('academic_session_id')->nullable()->after('invoice_id')->constrained('academic_sessions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('student_fee_adjustments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('academic_session_id');
        });

        Schema::table('refunds', function (Blueprint $table) {
            $table->dropConstrainedForeignId('academic_session_id');
        });
    }
};
