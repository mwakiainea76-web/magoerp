<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\Student;
use App\Models\StudentMark;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarksExportTest extends TestCase
{
    public function test_view_marks_exports_all_filtered_rows_in_each_supported_shape(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $session = AcademicSession::factory()->create();
        $unit = Unit::factory()->create();
        $student = Student::factory()->create(['admission_number' => 'MARKS/001']);
        $enrolment = AcademicSessionEnrolment::factory()->create([
            'academic_session_id' => $session->id,
            'student_id' => $student->id,
        ]);

        StudentUnitRegistration::factory()->create([
            'academic_session_enrolment_id' => $enrolment->id,
            'unit_id' => $unit->id,
        ]);

        foreach ([
            ['assessment_type' => 'CAT', 'assessment_number' => 1, 'score' => 80, 'is_published' => true],
            ['assessment_type' => 'CAT', 'assessment_number' => 2, 'score' => 60, 'is_published' => true],
            ['assessment_type' => 'CAT', 'assessment_number' => 3, 'score' => 99, 'is_published' => false],
            ['assessment_type' => 'PRAC', 'assessment_number' => 1, 'score' => 75, 'is_published' => true],
        ] as $mark) {
            StudentMark::factory()->create([
                ...$mark,
                'academic_session_enrolment_id' => $enrolment->id,
                'unit_id' => $unit->id,
                'recorded_by' => $admin->id,
            ]);
        }

        $filters = http_build_query([
            'academic_session_id' => $session->id,
            'unit_id' => $unit->id,
            'page' => 1,
            'per_page' => 1,
        ]);

        $marksResponse = $this->get('/api/marks?assessment_type=CAT%201&'.$filters);
        $marksResponse->assertOk()->assertJsonPath('data.0.student.admission_number', 'MARKS/001');

        $csvResponse = $this->get('/api/marks/export?format=csv&'.$filters);
        $csvResponse->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $csv = $csvResponse->streamedContent();

        $this->assertStringContainsString('MARKS/001', $csv);
        $this->assertStringContainsString('AVG(CAT)', $csv);
        $this->assertStringContainsString('70.0', $csv);
        $this->assertStringNotContainsString(',99,', $csv);

        $typeResponse = $this->get('/api/marks/export?format=xlsx&assessment_type=CAT%201&'.$filters);
        $typeResponse->assertOk();
        $this->assertStringStartsWith('PK', $typeResponse->streamedContent());

        $pdfResponse = $this->get('/api/marks/export?format=pdf&'.$filters);
        $pdfResponse->assertOk();
        $this->assertStringStartsWith('%PDF-1.4', $pdfResponse->streamedContent());
    }
}
