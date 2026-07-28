<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_devices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('uuid')->unique();
            $table->string('fingerprint_hash', 64)->nullable()->index();
            $table->string('browser', 100)->nullable();
            $table->string('browser_version', 50)->nullable();
            $table->string('platform', 50)->nullable();
            $table->string('operating_system', 100)->nullable();
            $table->string('device_type', 30)->nullable()->default('unknown');
            $table->string('language', 20)->nullable();
            $table->string('timezone', 60)->nullable();
            $table->string('screen_resolution', 20)->nullable();
            $table->text('user_agent')->nullable();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->integer('risk_score')->default(0);
            $table->boolean('is_trusted')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_devices');
    }
};
