<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_years', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50);
            $table->string('name', 100);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('staffs')->nullOnDelete();
            $table->timestamps();

            $table->unique('code');
            $table->unique('name');
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE academic_years ADD COLUMN active_unique CHAR(1) AS (CASE WHEN is_active = 1 THEN 'Y' ELSE NULL END) PERSISTENT");
            DB::statement("CREATE UNIQUE INDEX academic_years_active_unique ON academic_years (active_unique)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_years');
    }
};
