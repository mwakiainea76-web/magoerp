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
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Authentication & Account
            $table->string('login_id')->unique()->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->boolean('must_reset_password')->default(false);
            $table->string('password');
            $table->rememberToken();
            $table->string('role')->default('student');
            $table->boolean('status')->default(true);

            // Personal Information
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->enum('gender', ['male', 'female', 'other']);
            $table->date('date_of_birth');
            $table->string('nationality')->nullable();
            $table->string('national_id')->nullable()->unique();
            $table->string('place_of_birth')->nullable();
            $table->string('religion')->nullable();
                      $table->string('country')->default('Kenya');
     $table->string('county')->nullable();
            // Contact Information
            $table->string('phone_number')->unique();
            $table->string('alternative_phone_number')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('postal_code')->nullable();
  

            // Profile
            $table->string('profile_picture')->nullable();

            // Disability Information
            $table->boolean('is_pwd')->default(false);
            $table->string('disability_type')->nullable();
            $table->text('disability_description')->nullable();

            // Emergency Contact
            $table->string('next_of_kin_last_name')->nullable();
            $table->string('next_of_kin_first_name')->nullable();
            $table->string('next_of_kin_phone')->nullable();
            $table->string('next_of_kin_alt_phone')->nullable();
            $table->string('next_of_kin_email')->nullable();
            $table->string('next_of_kin_relationship')->nullable();

            // Audit Fields
            $table->timestamp('last_login_at')->nullable();
            $table->foreignUuid('created_by')->nullable();
            $table->foreignUuid('updated_by')->nullable();

            // Timestamps
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
