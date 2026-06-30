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

class StudentPublishedMarksVisibilityTest extends TestCase
{
    public function test_student_can_only_read_their_own_published_marks(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $session = AcademicSession::factory()->create();
        $unit = Unit::factory()->create();
        $student = Student::factory()->create(['admission_number' => 'VISIBLE/001']);
        $otherStudent = Student::factory()->create(['admission_number' => 'HIDDEN/002']);
        $enrolment = $this->enrolStudent($student, $session, $unit);
        $otherEnrolment = $this->enrolStudent($otherStudent, $session, $unit);

        $published = $this->createMark($enrolment, $unit, 'CAT', 1, 80, true);
        $draft = $this->createMark($enrolment, $unit, 'PRAC', 1, 99, false);
        $otherPublished = $this->createMark($otherEnrolment, $unit, 'CAT', 1, 65, true);

        Sanctum::actingAs($student->user);

        $list = $this->getJson('/api/marks?'.http_build_query([
            'academic_session_id' => $session->id,
            'unit_id' => $unit->id,
        ]));
        $list->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.score', 80);

        $this->getJson('/api/marks/'.$published->id)->assertOk();
        $this->getJson('/api/marks/'.$draft->id)->assertForbidden();
        $this->getJson('/api/marks/'.$otherPublished->id)->assertForbidden();
        $this->putJson('/api/marks/'.$published->id, ['score' => 90])->assertForbidden();

        $marksheet = $this->getJson('/api/marks/marksheet?'.http_build_query([
            'academic_session_id' => $session->id,
            'unit_id' => $unit->id,
            'student_id' => $otherStudent->id,
        ]));
        $marksheet->assertOk();

        $rows = $marksheet->json('data.marksheet');
        $this->assertCount(1, $rows);
        $this->assertSame($student->id, $rows[0]['student']['id']);
        $this->assertSame(['CAT'], array_keys($rows[0]['types']));
        $this->assertSame(80, $rows[0]['types']['CAT']['marks']['CAT_1']['score']);
    }

    private function enrolStudent(Student $student, AcademicSession $session, Unit $unit): AcademicSessionEnrolment
    {
        $enrolment = AcademicSessionEnrolment::factory()->create([
            'academic_session_id' => $session->id,
            'student_id' => $student->id,
        ]);

        StudentUnitRegistration::factory()->create([
            'academic_session_enrolment_id' => $enrolment->id,
            'unit_id' => $unit->id,
        ]);

        return $enrolment;
    }

    private function createMark(
        AcademicSessionEnrolment $enrolment,
        Unit $unit,
        string $type,
        int $number,
        int $score,
        bool $published,
    ): StudentMark {
        return StudentMark::factory()->create([
            'academic_session_enrolment_id' => $enrolment->id,
            'unit_id' => $unit->id,
            'assessment_type' => $type,
            'assessment_number' => $number,
            'score' => $score,
            'is_published' => $published,
            'recorded_by' => null,
        ]);
    }
}
