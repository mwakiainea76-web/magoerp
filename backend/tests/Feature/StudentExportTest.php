<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentExportTest extends TestCase
{
    public function test_csv_export_uses_filters_but_ignores_ui_pagination(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        foreach (['STU/EXPORT/001', 'STU/EXPORT/002', '=2+3'] as $admissionNumber) {
            $user = User::factory()->student()->create(['first_name' => 'ExportMatch']);
            Student::factory()->create([
                'user_id' => $user->id,
                'admission_number' => $admissionNumber,
            ]);
        }

        $otherUser = User::factory()->student()->create(['first_name' => 'DoNotInclude']);
        Student::factory()->create([
            'user_id' => $otherUser->id,
            'admission_number' => 'STU/OTHER/001',
        ]);

        $response = $this->get('/api/students/export?format=csv&q=ExportMatch&page=1&per_page=1');

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $csv = $response->streamedContent();

        $this->assertStringContainsString('STU/EXPORT/001', $csv);
        $this->assertStringContainsString('STU/EXPORT/002', $csv);
        $this->assertStringContainsString("'=2+3", $csv);
        $this->assertStringNotContainsString('STU/OTHER/001', $csv);
        $this->assertSame(4, substr_count(trim($csv), "\n") + 1);

        $xlsx = $this->get('/api/students/export?format=xlsx&q=ExportMatch&page=1&per_page=1');
        $xlsx->assertOk();
        $this->assertStringStartsWith('PK', $xlsx->streamedContent());

        $pdf = $this->get('/api/students/export?format=pdf&q=ExportMatch&page=1&per_page=1');
        $pdf->assertOk();
        $this->assertStringStartsWith('%PDF-1.4', $pdf->streamedContent());
    }

    public function test_export_requires_student_view_permission(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        Sanctum::actingAs(User::factory()->student()->create());

        $this->get('/api/students/export?format=csv')->assertForbidden();
    }

    public function test_export_rejects_an_unknown_format(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->get('/api/students/export?format=xml')->assertUnprocessable();
    }
}
