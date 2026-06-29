<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE `certification_levels` (
    `id` CHAR(36) NOT NULL,
    `certification_authority_id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `entry_grade` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `cert_levels_authority_code_unique` (`certification_authority_id`, `code`),
    UNIQUE KEY `cert_levels_authority_name_unique` (`certification_authority_id`, `name`),
    KEY `cert_levels_authority_name_index` (`certification_authority_id`, `name`),
    KEY `cert_levels_created_by_foreign` (`created_by`),
    KEY `cert_levels_updated_by_foreign` (`updated_by`),
    CONSTRAINT `cert_levels_authority_foreign` FOREIGN KEY (`certification_authority_id`) REFERENCES `certification_authorities` (`id`) ON DELETE CASCADE,
    CONSTRAINT `cert_levels_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `cert_levels_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('certification_levels');
    }
};
