<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\CourseInvoiceTemplate;
use App\Models\Invoice;
use App\Models\InvoiceComponent;
use App\Models\InvoiceItem;
use App\Models\InvoiceTemplate;
use App\Models\InvoiceTemplateItem;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Student;
use Illuminate\Database\Seeder;

class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        $template = InvoiceTemplate::updateOrCreate(
            ['code' => 'DIP-FULL-2025'],
            [
                'name' => 'Diploma Full Fee 2025',
                'description' => 'Standard full fee template for diploma programmes',
                'is_active' => true,
            ]
        );

        $items = [
            ['name' => 'Tuition Fee', 'amount' => 45000],
            ['name' => 'Examination Fee', 'amount' => 5000],
            ['name' => 'Library Fee', 'amount' => 3000],
            ['name' => 'Caution Money', 'amount' => 2000],
            ['name' => 'Activity Fee', 'amount' => 2500],
        ];

        $createdItems = [];
        foreach ($items as $item) {
            $createdItems[] = InvoiceTemplateItem::updateOrCreate(
                ['invoice_template_id' => $template->id, 'name' => $item['name']],
                ['amount' => $item['amount'], 'is_active' => true]
            );
        }

        $session = AcademicSession::where('is_active', true)->first();

        $courses = Course::whereIn('code', ['DICT', 'DBM'])->get();
        foreach ($courses as $course) {
            for ($year = 1; $year <= $course->duration; $year++) {
                for ($sessionNum = 1; $sessionNum <= 2; $sessionNum++) {
                    CourseInvoiceTemplate::updateOrCreate(
                        [
                            'course_id' => $course->id,
                            'year_level' => $year,
                            'session_number' => $sessionNum,
                        ],
                        [
                            'invoice_template_id' => $template->id,
                            'academic_session_id' => $session?->id,
                            'is_approved' => true,
                        ]
                    );
                }
            }
        }

        $student = Student::first();
        if ($student && $session && $createdItems) {
            $invoice = Invoice::updateOrCreate(
                ['idempotency_key' => "test-seed:{$student->id}:{$session->id}"],
                [
                    'invoice_number' => Invoice::generateInvoiceNumber(),
                    'student_id' => $student->id,
                    'academic_session_id' => $session->id,
                    'invoice_type' => 'fees',
                    'status' => 'issued',
                    'issue_date' => now()->toDateString(),
                    'due_date' => now()->addDays(30)->toDateString(),
                    'amount_due' => 57500,
                    'paid_amount' => 0,
                    'balance_due' => 57500,
                ]
            );

            foreach ($createdItems as $templateItem) {
                InvoiceItem::updateOrCreate(
                    ['invoice_id' => $invoice->id, 'invoice_template_item_id' => $templateItem->id],
                    [
                        'description' => $templateItem->name,
                        'unit_amount' => $templateItem->amount,
                        'quantity' => 1,
                        'total_amount' => $templateItem->amount,
                    ]
                );

                InvoiceComponent::updateOrCreate(
                    ['invoice_id' => $invoice->id, 'invoice_template_item_id' => $templateItem->id],
                    [
                        'name' => $templateItem->name,
                        'amount' => $templateItem->amount,
                        'snapshot_data' => [
                            'template_code' => $template->code,
                            'template_name' => $template->name,
                            'item_name' => $templateItem->name,
                            'item_amount' => $templateItem->amount,
                            'academic_session_id' => $session->id,
                            'snapshot_taken_at' => now()->toDateTimeString(),
                        ],
                    ]
                );
            }

            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'student_id' => $student->id,
                'amount' => 30000,
                'payment_date' => now()->toDateString(),
                'method' => 'MPESA',
                'reference' => 'MPE-TEST-123456',
                'status' => 'completed',
            ]);

            PaymentAllocation::create([
                'payment_id' => $payment->id,
                'invoice_id' => $invoice->id,
                'amount' => 30000,
                'allocated_at' => now()->toDateString(),
            ]);

            $invoice->recalculateTotals();
        }
    }
}
