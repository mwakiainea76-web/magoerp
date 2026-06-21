<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('curricula', function (Blueprint $table) {
            $table->foreignUuid('certification_authority_id')
                ->after('id')
                ->nullable()
                ->constrained('certification_authorities')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('curricula', function (Blueprint $table) {
            $table->dropConstrainedForeignId('certification_authority_id');
        });
    }
};
