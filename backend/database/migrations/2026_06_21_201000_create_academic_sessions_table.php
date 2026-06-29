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
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['academic_year_id', 'code']);
            $table->unique(['academic_year_id', 'name']);
            $table->index(['academic_year_id', 'name']);
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE academic_sessions ADD COLUMN active_unique CHAR(1) AS (CASE WHEN is_active = 1 THEN 'Y' ELSE NULL END) PERSISTENT");
            DB::statement("CREATE UNIQUE INDEX academic_sessions_active_unique ON academic_sessions (active_unique)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_sessions');
    }
};
