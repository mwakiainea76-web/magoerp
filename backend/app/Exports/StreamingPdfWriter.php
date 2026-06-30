<?php

namespace App\Exports;

use ArrayIterator;
use Generator;
use Iterator;
use IteratorAggregate;
use IteratorIterator;
use RuntimeException;

class StreamingPdfWriter
{
    private const PAGE_WIDTH = 841.89;

    private const PAGE_HEIGHT = 595.28;

    private const ROW_HEIGHT = 20.0;

    private const ROWS_PER_PAGE = 22;

    private const CHAR_WIDTH = 4.7;

    private const CELL_PADDING = 15;

    private const MIN_WIDTH = 30;

    private const WIDTH_SAMPLE_SIZE = 200;

    private array $columnWidths = [];

    private string $footer;

    public function __construct(string $footer = '')
    {
        $this->footer = $footer;
    }

    public function output(array $headers, iterable $rows, string $title): void
    {
        $columnCount = count($headers);
        $maxLengths = array_fill(0, $columnCount, 0);
        $sampleRows = [];
        $iterator = $this->toIterator($rows);

        foreach ($headers as $i => $h) {
            $maxLengths[$i] = mb_strlen((string) $h);
        }

        $iterator->rewind();

        while ($iterator->valid() && count($sampleRows) < self::WIDTH_SAMPLE_SIZE) {
            $row = $iterator->current();
            $row = array_values((array) $row);
            $sampleRows[] = $row;

            foreach ($row as $i => $value) {
                if ($i >= $columnCount) {
                    break;
                }

                $len = mb_strlen((string) $value);
                if ($len > $maxLengths[$i]) {
                    $maxLengths[$i] = $len;
                }
            }

            $iterator->next();
        }

        $this->columnWidths = $this->calculateWidths($maxLengths);
        $this->render($headers, $this->streamRows($sampleRows, $iterator), $title);
    }

    private function toIterator(iterable $rows): Iterator
    {
        if (is_array($rows)) {
            return new ArrayIterator($rows);
        }

        if ($rows instanceof Iterator) {
            return $rows;
        }

        if ($rows instanceof IteratorAggregate) {
            $rows = $rows->getIterator();
        }

        return $rows instanceof Iterator ? $rows : new IteratorIterator($rows);
    }

    private function streamRows(array $sampleRows, Iterator $remainingRows): Generator
    {
        foreach ($sampleRows as $row) {
            yield $row;
        }

        while ($remainingRows->valid()) {
            yield array_values((array) $remainingRows->current());
            $remainingRows->next();
        }
    }

    private function calculateWidths(array $maxLengths): array
    {
        $available = self::PAGE_WIDTH - 60;
        $totalChars = array_sum($maxLengths);

        if ($totalChars === 0) {
            $w = (int) floor($available / count($maxLengths));
            $widths = array_fill(0, count($maxLengths), $w);
            $widths[array_key_last($widths)] += (int) ($available - array_sum($widths));

            return $widths;
        }

        $widths = [];
        $rawTotal = 0;

        foreach ($maxLengths as $len) {
            $w = max(self::MIN_WIDTH, $len * self::CHAR_WIDTH + self::CELL_PADDING);
            $widths[] = $w;
            $rawTotal += $w;
        }

        if ($rawTotal > $available) {
            $scale = ($available - self::MIN_WIDTH * count($widths)) / ($rawTotal - self::MIN_WIDTH * count($widths));
            foreach ($widths as $i => $w) {
                $widths[$i] = self::MIN_WIDTH + ($w - self::MIN_WIDTH) * $scale;
            }
        } elseif ($rawTotal < $available) {
            $extra = $available - $rawTotal;
            foreach ($widths as $i => $w) {
                $widths[$i] = $w + ($w / $rawTotal) * $extra;
            }
        }

        $rounded = array_map(fn ($w) => (int) floor($w), $widths);
        $remainder = (int) ($available - array_sum($rounded));
        if ($remainder > 0 && $rounded !== []) {
            $rounded[array_key_last($rounded)] += $remainder;
        }

        return $rounded;
    }

    private function render(array $headers, iterable $rows, string $title): void
    {
        $output = fopen('php://output', 'wb');

        if ($output === false) {
            throw new RuntimeException('Unable to open the PDF output stream.');
        }

        $offset = 0;
        $offsets = [];
        $pageIds = [];
        $nextObjectId = 5;

        $write = function (string $value) use ($output, &$offset): void {
            $written = fwrite($output, $value);
            if ($written === false) {
                throw new RuntimeException('Unable to write the PDF output stream.');
            }
            $offset += $written;
        };

        $writeObject = function (int $id, string $body) use (&$offsets, &$offset, $write): void {
            $offsets[$id] = $offset;
            $write("{$id} 0 obj\n{$body}\nendobj\n");
        };

        $write("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
        $writeObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
        $writeObject(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        $writeObject(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

        $pageRows = [];
        $pageNumber = 1;

        foreach ($rows as $row) {
            $pageRows[] = $row;
            if (count($pageRows) === self::ROWS_PER_PAGE) {
                $this->writePage($writeObject, $pageIds, $nextObjectId, $headers, $pageRows, $title, $pageNumber++);
                $pageRows = [];
            }
        }

        if ($pageRows !== [] || $pageIds === []) {
            $this->writePage($writeObject, $pageIds, $nextObjectId, $headers, $pageRows, $title, $pageNumber);
        }

        $kids = implode(' ', array_map(fn (int $id) => "{$id} 0 R", $pageIds));
        $writeObject(2, '<< /Type /Pages /Kids ['.$kids.'] /Count '.count($pageIds).' >>');

        $xrefOffset = $offset;
        $maxObjectId = max(array_keys($offsets));
        $write("xref\n0 ".($maxObjectId + 1)."\n");
        $write("0000000000 65535 f \n");
        for ($id = 1; $id <= $maxObjectId; $id++) {
            $write(sprintf("%010d 00000 n \n", $offsets[$id]));
        }

        $write("trailer\n<< /Size ".($maxObjectId + 1)." /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF\n");
        fclose($output);
    }

    private function writePage(
        callable $writeObject,
        array &$pageIds,
        int &$nextObjectId,
        array $headers,
        array $rows,
        string $title,
        int $pageNumber,
    ): void {
        $pageId = $nextObjectId++;
        $contentId = $nextObjectId++;
        $pageIds[] = $pageId;
        $content = $this->pageContent($headers, $rows, $title, $pageNumber);

        $writeObject(
            $pageId,
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '.self::PAGE_WIDTH.' '.self::PAGE_HEIGHT.'] '.
            '/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '.$contentId.' 0 R >>',
        );
        $writeObject($contentId, '<< /Length '.strlen($content)." >>\nstream\n{$content}\nendstream");
    }

    private function pageContent(array $headers, array $rows, string $title, int $pageNumber): string
    {
        $left = 30.0;
        $tableTop = self::PAGE_HEIGHT - 88.0;
        $tableWidth = array_sum($this->columnWidths);
        $content = "0.25 w\n";

        $content .= sprintf("0.055 0.145 0.235 rg %.2F %.2F %.2F 46 re f\n", $left, self::PAGE_HEIGHT - 66.0, $tableWidth);
        $content .= "1 1 1 rg\n";
        $content .= $this->text($left + 16, self::PAGE_HEIGHT - 38.0, 16, $title, 'F2');
        $content .= "0.78 0.86 0.91 rg\n";
        $content .= $this->text($left + 16, self::PAGE_HEIGHT - 53.0, 7.5, 'Generated '.now()->format('d M Y, H:i').'  |  Page '.$pageNumber);

        $content .= sprintf("0.075 0.36 0.40 rg %.2F %.2F %.2F %.2F re f\n", $left, $tableTop - self::ROW_HEIGHT, $tableWidth, self::ROW_HEIGHT);
        $this->appendRow($content, $headers, $left, $tableTop, true);
        $y = $tableTop - self::ROW_HEIGHT;

        foreach ($rows as $index => $row) {
            $fill = $index % 2 === 0 ? '1 1 1' : '0.955 0.975 0.978';
            $content .= sprintf("%s rg %.2F %.2F %.2F %.2F re f\n", $fill, $left, $y - self::ROW_HEIGHT, $tableWidth, self::ROW_HEIGHT);
            $this->appendRow($content, $row, $left, $y);
            $y -= self::ROW_HEIGHT;
        }

        $content .= sprintf("0.78 0.82 0.85 RG %.2F 27 m %.2F 27 l S\n", $left, $left + $tableWidth);
        $content .= "0.38 0.44 0.49 rg\n";
        $footer = $this->footer ?: $title;
        $content .= $this->text($left, 16, 7, $footer);
        $content .= $this->text($left + $tableWidth - 42, 16, 7, 'Page '.$pageNumber, 'F2');

        return $content;
    }

    private function appendRow(string &$content, array $values, float $left, float $top, bool $heading = false): void
    {
        $x = $left;
        $fontSize = 8.0;

        foreach ($this->columnWidths as $index => $width) {
            $border = $heading ? '0.055 0.28 0.32' : '0.80 0.84 0.87';
            $content .= sprintf("%s RG %.2F %.2F %.2F %.2F re S\n", $border, $x, $top - self::ROW_HEIGHT, $width, self::ROW_HEIGHT);
            $value = (string) ($values[$index] ?? '');
            $maximumCharacters = max(1, (int) floor(($width - 10) / ($fontSize * 0.5)));
            $value = $this->truncate($value, $maximumCharacters);

            if ($heading) {
                $content .= "1 1 1 rg\n";
            } else {
                $content .= "0.12 0.17 0.22 rg\n";
            }

            $font = $heading ? 'F2' : 'F1';
            $content .= $this->text($x + 5, $top - 13.0, $fontSize, $value, $font);
            $x += $width;
        }
    }

    private function text(float $x, float $y, float $size, string $value, string $font = 'F1'): string
    {
        $encoded = iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $value);
        $encoded = $encoded === false ? '' : $encoded;
        $encoded = str_replace(['\\', '(', ')', "\r", "\n"], ['\\\\', '\\(', '\\)', ' ', ' '], $encoded);

        return sprintf("BT /%s %.2F Tf %.2F %.2F Td (%s) Tj ET\n", $font, $size, $x, $y, $encoded);
    }

    private function truncate(string $value, int $maximumCharacters): string
    {
        if (mb_strlen($value) <= $maximumCharacters) {
            return $value;
        }

        return mb_substr($value, 0, max(1, $maximumCharacters - 3)).'...';
    }
}
