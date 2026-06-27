<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('staffs', function (Blueprint $table) {
           $table->uuid('id')->primary();

$table->foreignUuid('user_id')->unique()->constrained('users')->cascadeOnDelete();

// Employee Information
$table->string('employee_number')->unique();

// Personal Information
$table->string('kra_pin')->nullable()->unique();
$table->string('nhif_number')->nullable();
$table->string('nssf_number')->nullable();
$table->foreignUuid('department_id')->nullable()->constrained();
$table->string('job_title');
$table->string('employment_type'); // Permanent, Contract, Part-time, Casual
$table->date('date_joined');
$table->date('confirmation_date')->nullable();
$table->date('contract_end_date')->nullable();
$table->decimal('basic_salary', 12, 2)->nullable();
$table->boolean('is_teaching_staff')->default(false);

//Academic & Professional Details
$table->string('highest_qualification')->nullable();
$table->string('specialization')->nullable();


// Employment Status
$table->boolean('status')->default(true);
$table->date('termination_date')->nullable();
$table->text('termination_reason')->nullable();

// Audit
$table->uuid('created_by')->nullable();
$table->uuid('updated_by')->nullable();
$table->timestamps();
$table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staffs');
    }
};
