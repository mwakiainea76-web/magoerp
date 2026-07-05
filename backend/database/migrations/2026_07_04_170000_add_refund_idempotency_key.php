<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->string('idempotency_key', 150)->nullable()->after('reason');
            $table->unique('idempotency_key', 'refund_idempotency_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->dropUnique('refund_idempotency_key_unique');
            $table->dropColumn('idempotency_key');
        });
    }
};
