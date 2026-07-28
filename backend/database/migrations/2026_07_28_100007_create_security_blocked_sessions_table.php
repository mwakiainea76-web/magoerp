<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_blocked_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('session_id', 100)->unique();
            $table->string('reason', 255)->nullable();
            $table->timestamp('blocked_until')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_blocked_sessions');
    }
};
