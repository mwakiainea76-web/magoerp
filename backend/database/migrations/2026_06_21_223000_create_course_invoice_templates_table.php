<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE `course_invoice_templates` (
    `id` CHAR(36) NOT NULL,
    `course_curriculum_id` CHAR(36) NULL,
    `invoice_template_id` CHAR(36) NOT NULL,
    `academic_session_id` CHAR(36) NULL,
    `year_level` INT NOT NULL,
    `session_number` INT NOT NULL,
    `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
    `approved_by` CHAR(36) NULL,
    `approved_at` TIMESTAMP NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    KEY `cit_course_curriculum_foreign` (`course_curriculum_id`),
    KEY `cit_invoice_template_foreign` (`invoice_template_id`),
    KEY `cit_academic_session_foreign` (`academic_session_id`),
    KEY `cit_approved_by_foreign` (`approved_by`),
    KEY `cit_created_by_foreign` (`created_by`),
    KEY `cit_updated_by_foreign` (`updated_by`),
    CONSTRAINT `cit_course_curriculum_foreign` FOREIGN KEY (`course_curriculum_id`) REFERENCES `course_curricula` (`id`) ON DELETE SET NULL,
    CONSTRAINT `cit_invoice_template_foreign` FOREIGN KEY (`invoice_template_id`) REFERENCES `invoice_templates` (`id`) ON DELETE CASCADE,
    CONSTRAINT `cit_academic_session_foreign` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions` (`id`) ON DELETE SET NULL,
    CONSTRAINT `cit_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `cit_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `cit_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('course_invoice_templates');
    }
};
