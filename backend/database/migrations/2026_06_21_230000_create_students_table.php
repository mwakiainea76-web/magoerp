<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained('staffs')->cascadeOnDelete();
            $table->string('admission_number')->unique();

            $table->boolean('status')->default(true);
            $table->foreignUuid('created_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
