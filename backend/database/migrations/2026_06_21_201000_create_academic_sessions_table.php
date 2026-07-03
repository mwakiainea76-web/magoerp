<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 100);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(false);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['academic_year_id', 'code']);
            $table->unique(['academic_year_id', 'name']);
            $table->index(['academic_year_id', 'start_date', 'code'], 'academic_sessions_year_date_idx');
            $table->index(['is_active', 'start_date'], 'academic_sessions_active_date_idx');
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE academic_sessions ADD COLUMN active_unique CHAR(1) AS (CASE WHEN is_active = 1 THEN 'Y' ELSE NULL END) PERSISTENT");
            DB::statement("CREATE UNIQUE INDEX academic_sessions_active_unique ON academic_sessions (academic_year_id, active_unique)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_sessions');
    }
};
