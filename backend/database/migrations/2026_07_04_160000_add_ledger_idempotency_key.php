<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_ledger_entries', function (Blueprint $table) {
            $table->string('idempotency_key', 150)->nullable()->after('description');
            $table->unique('idempotency_key', 'ledger_idempotency_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('student_ledger_entries', function (Blueprint $table) {
            $table->dropUnique('ledger_idempotency_key_unique');
            $table->dropColumn('idempotency_key');
        });
    }
};
