<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_endpoint_errors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('method', 10);
            $table->string('path', 500);
            $table->unsignedInteger('error_count')->default(1);
            $table->text('last_error_message')->nullable();
            $table->json('last_context')->nullable();
            $table->string('last_ip', 45)->nullable();
            $table->string('status', 20)->default('pending');
            $table->uuid('escalated_by')->nullable();
            $table->timestamp('escalated_at')->nullable();
            $table->text('escalation_note')->nullable();
            $table->timestamp('first_occurred_at')->nullable();
            $table->timestamp('last_occurred_at')->nullable();
            $table->timestamps();

            $table->unique(['method', 'path']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_endpoint_errors');
    }
};
