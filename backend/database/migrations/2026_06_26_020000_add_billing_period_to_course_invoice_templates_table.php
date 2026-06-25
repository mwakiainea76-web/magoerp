<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_invoice_templates', function (Blueprint $table) {
            $table->string('billing_period', 20)->default('session')->after('session_number');
        });
    }

    public function down(): void
    {
        Schema::table('course_invoice_templates', function (Blueprint $table) {
            $table->dropColumn('billing_period');
        });
    }
};
