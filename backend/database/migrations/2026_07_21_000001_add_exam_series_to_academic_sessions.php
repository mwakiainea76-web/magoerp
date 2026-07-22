<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_series', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100);
            $table->string('short_name', 50)->nullable();
            $table->json('assessment_types')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('academic_session_id')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('academic_session_id')->references('id')->on('academic_sessions')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('student_unit_registrations', function (Blueprint $table) {
            $table->uuid('exam_series_id')->nullable()->after('unit_id');

            $table->foreign('exam_series_id')
                ->references('id')->on('exam_series')->nullOnDelete();
        });

        Schema::table('student_marks', function (Blueprint $table) {
            $table->uuid('exam_series_id')->nullable()->after('unit_id');

            $table->foreign('exam_series_id')
                ->references('id')->on('exam_series')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('student_marks', function (Blueprint $table) {
            $table->dropForeign(['exam_series_id']);
            $table->dropColumn('exam_series_id');
        });

        Schema::table('student_unit_registrations', function (Blueprint $table) {
            $table->dropForeign(['exam_series_id']);
            $table->dropColumn('exam_series_id');
        });

        Schema::dropIfExists('exam_series');
    }
};
