<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE `course_curriculum_invoice_template` (
    `id` CHAR(36) NOT NULL,
    `course_curriculum_id` CHAR(36) NOT NULL,
    `invoice_template_id` CHAR(36) NOT NULL,
    `academic_session_id` CHAR(36) NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    KEY `ccit_course_curriculum_foreign` (`course_curriculum_id`),
    KEY `ccit_invoice_template_foreign` (`invoice_template_id`),
    KEY `ccit_academic_session_foreign` (`academic_session_id`),
    CONSTRAINT `ccit_course_curriculum_foreign` FOREIGN KEY (`course_curriculum_id`) REFERENCES `course_curricula` (`id`) ON DELETE CASCADE,
    CONSTRAINT `ccit_invoice_template_foreign` FOREIGN KEY (`invoice_template_id`) REFERENCES `invoice_templates` (`id`) ON DELETE CASCADE,
    CONSTRAINT `ccit_academic_session_foreign` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions` (`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('course_curriculum_invoice_template');
    }
};
