<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\Student;
use App\Models\StudentMark;
use App\Models\StudentUnitRegistration;
use App\Models\Unit;
use Database\Seeders\RolesAndPermissionsSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentMyMarksheetTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_student_marksheet_groups_registered_units_by_selected_year_of_study(): void
    {
        $student = Student::factory()->create(['admission_number' => 'MS/001']);
        $yearOneSession = AcademicSession::factory()->create();
        $yearTwoSession = AcademicSession::factory()->create();

        $yearOneUnit = Unit::factory()->create([
            'code' => 'Y1-UNIT',
            'name' => 'Year One Unit',
            'year_of_study' => 1,
        ]);
        $yearTwoUnit = Unit::factory()->create([
            'code' => 'Y2-UNIT',
            'name' => 'Year Two Unit',
            'year_of_study' => 2,
        ]);

        $yearOneEnrolment = AcademicSessionEnrolment::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $yearOneSession->id,
            'year_of_study' => 1,
        ]);
        $yearTwoEnrolment = AcademicSessionEnrolment::factory()->create([
            'student_id' => $student->id,
            'academic_session_id' => $yearTwoSession->id,
            'year_of_study' => 2,
        ]);

        StudentUnitRegistration::factory()->create([
            'academic_session_enrolment_id' => $yearOneEnrolment->id,
            'unit_id' => $yearOneUnit->id,
        ]);
        StudentUnitRegistration::factory()->create([
            'academic_session_enrolment_id' => $yearTwoEnrolment->id,
            'unit_id' => $yearTwoUnit->id,
        ]);

        StudentMark::factory()->create([
            'academic_session_enrolment_id' => $yearOneEnrolment->id,
            'unit_id' => $yearOneUnit->id,
            'assessment_type' => 'CAT',
            'assessment_number' => 1,
            'score' => 81,
            'is_published' => true,
            'recorded_by' => null,
        ]);
        StudentMark::factory()->create([
            'academic_session_enrolment_id' => $yearOneEnrolment->id,
            'unit_id' => $yearOneUnit->id,
            'assessment_type' => 'PRAC',
            'assessment_number' => 2,
            'score' => 74,
            'is_published' => true,
            'recorded_by' => null,
        ]);
        StudentMark::factory()->create([
            'academic_session_enrolment_id' => $yearTwoEnrolment->id,
            'unit_id' => $yearTwoUnit->id,
            'assessment_type' => 'CAT',
            'assessment_number' => 1,
            'score' => 66,
            'is_published' => true,
            'recorded_by' => null,
        ]);

        Sanctum::actingAs($student->user);

        $this->getJson('/api/my/marksheet')
            ->assertOk()
            ->assertJsonPath('data.selected_year_of_study', null)
            ->assertJsonPath('data.student.admission_number', 'MS/001')
            ->assertJsonPath('data.years_of_study.0.value', 1)
            ->assertJsonPath('data.years_of_study.1.value', 2)
            ->assertJsonCount(0, 'data.marksheet');

        $response = $this->getJson('/api/my/marksheet?year_of_study=1')
            ->assertOk()
            ->assertJsonPath('data.selected_year_of_study', 1)
            ->assertJsonCount(1, 'data.marksheet')
            ->assertJsonPath('data.marksheet.0.unit.code', 'Y1-UNIT')
            ->assertJsonPath('data.marksheet.0.scores.CAT 1', 81)
            ->assertJsonPath('data.marksheet.0.scores.PRAC 2', 74)
            ->assertJsonPath('data.marksheet.0.averages.CAT', 81)
            ->assertJsonPath('data.marksheet.0.averages.PRAC', 74);

        $this->assertSame('Year One Unit', $response->json('data.marksheet.0.unit.name'));
    }
}
