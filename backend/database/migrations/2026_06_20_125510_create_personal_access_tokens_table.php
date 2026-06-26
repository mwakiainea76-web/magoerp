<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE `personal_access_tokens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tokenable_type` VARCHAR(255) NOT NULL,
    `tokenable_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `abilities` TEXT NULL,
    `last_used_at` TIMESTAMP NULL,
    `expires_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `pat_token_unique` (`token`),
    KEY `pat_tokenable_index` (`tokenable_type`, `tokenable_id`),
    KEY `pat_expires_at_index` (`expires_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
