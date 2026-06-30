<?php

namespace Tests\Unit;

use App\Exports\StreamingPdfWriter;
use PHPUnit\Framework\TestCase;

class StreamingPdfWriterTest extends TestCase
{
    public function test_it_writes_multiple_pages_without_collecting_the_input(): void
    {
        $rows = (function () {
            for ($index = 1; $index <= 89; $index++) {
                yield array_fill(0, 8, 'Student '.$index);
            }
        })();

        ob_start();
        (new StreamingPdfWriter)->output(array_fill(0, 8, 'Heading'), $rows, 'Students');
        $pdf = ob_get_clean();

        $this->assertStringStartsWith('%PDF-1.4', $pdf);
        $this->assertStringContainsString('/Count 5', $pdf);
        $this->assertStringEndsWith("%%EOF\n", $pdf);
    }

    public function test_one_hundred_thousand_rows_are_streamed_with_bounded_memory(): void
    {
        $consumedRows = 0;
        $rows = (function () use (&$consumedRows) {
            for ($index = 1; $index <= 100_000; $index++) {
                $consumedRows++;

                yield [
                    $index,
                    'STU/'.$index,
                    'Student Name',
                    'A representative long course title',
                    'Diploma',
                    'Curriculum',
                    'Active',
                    'Male',
                ];
            }
        })();

        $peakBefore = memory_get_peak_usage(true);
        ob_start(static fn (string $chunk): string => '', 8192);

        try {
            (new StreamingPdfWriter)->output(
                ['#', 'Admission number', 'Name', 'Course', 'Level', 'Curriculum', 'Status', 'Gender'],
                $rows,
                'Students',
            );
        } finally {
            ob_end_clean();
        }

        $peakIncrease = memory_get_peak_usage(true) - $peakBefore;

        $this->assertSame(100_000, $consumedRows);
        $this->assertLessThan(12 * 1024 * 1024, $peakIncrease);
    }
}
