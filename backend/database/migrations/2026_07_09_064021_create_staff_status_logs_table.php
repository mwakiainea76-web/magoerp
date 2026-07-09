<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_status_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('staff_id')->constrained('staffs')->cascadeOnDelete();
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->text('reason')->nullable();
            $table->date('changed_at');
            $table->foreignUuid('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['staff_id', 'changed_at']);
            $table->index(['to_status', 'changed_at'], 'staff_status_logs_status_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_status_logs');
    }
};
