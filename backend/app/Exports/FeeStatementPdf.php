<?php

namespace App\Exports;

use RuntimeException;

class FeeStatementPdf
{
    private const PW = 595.28;
    private const PH = 841.89;
    private const ML = 34.0;
    private const MR = 34.0;
    private const MT = 28.0;
    private const MB = 34.0;
    private const CW = self::PW - self::ML - self::MR;
    private const LOGO_PATH = __DIR__ . '/../../resources/pdf-logo.jpg';

    private const FONT = 3;
    private const BOLD = 4;

    private $output;
    private int $offset = 0;
    private array $offsets = [];
    private array $pageIds = [];
    private int $nextId = 5;
    private ?array $logo = null;

    private array $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function output(): void
    {
        $this->output = fopen('php://output', 'wb');
        if ($this->output === false) {
            throw new RuntimeException('Unable to open output stream.');
        }

        $w = fn (string $v): int => $this->write($v);
        $obj = fn (int $id, string $body) => $this->writeObject($id, $body);

        $w("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
        $obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
        $obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        $obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

        $this->registerLogo();
        $this->renderPages();

        $kids = implode(' ', array_map(fn (int $id) => "{$id} 0 R", $this->pageIds));
        $obj(2, '<< /Type /Pages /Kids [' . $kids . '] /Count ' . count($this->pageIds) . ' >>');

        $xref = $this->offset;
        $maxId = max(array_keys($this->offsets));
        $w("xref\n0 " . ($maxId + 1) . "\n");
        $w("0000000000 65535 f \n");
        for ($id = 1; $id <= $maxId; $id++) {
            $w(sprintf("%010d 00000 n \n", $this->offsets[$id]));
        }
        $w("trailer\n<< /Size " . ($maxId + 1) . " /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF\n");
        fclose($this->output);
    }

    private function registerLogo(): void
    {
        if (! is_file(self::LOGO_PATH)) {
            return;
        }

        $info = @getimagesize(self::LOGO_PATH);
        $bytes = @file_get_contents(self::LOGO_PATH);
        if ($info === false || $bytes === false) {
            return;
        }

        $objectId = $this->nextId++;
        $this->logo = [
            'object_id' => $objectId,
            'width' => (int) ($info[0] ?? 0),
            'height' => (int) ($info[1] ?? 0),
        ];

        $this->writeObject(
            $objectId,
            '<< /Type /XObject /Subtype /Image /Width ' . $this->logo['width'] . ' /Height ' . $this->logo['height'] .
            ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' . strlen($bytes) . " >>\nstream\n" . $bytes . "\nendstream"
        );
    }

    private function renderPages(): void
    {
        $rows = $this->buildTransactionRows();
        $pages = [];
        $remaining = $rows;

        $firstLedgerTop = $this->estimateFirstPageLedgerTop();
        $continuationLedgerTop = $this->estimateContinuationLedgerTop();

        $firstAvailable = $firstLedgerTop - $this->contentBottom() - $this->tableHeaderHeight() - $this->totalRowHeight();
        $continuationAvailable = $continuationLedgerTop - $this->contentBottom() - $this->tableHeaderHeight() - $this->totalRowHeight();

        $pages[] = $this->takeRowsForHeight($remaining, $firstAvailable);
        while ($remaining !== []) {
            $pages[] = $this->takeRowsForHeight($remaining, $continuationAvailable);
        }

        if ($pages === []) {
            $pages[] = [];
        }

        $totalPages = count($pages);
        foreach ($pages as $index => $pageRows) {
            $this->writePage($pageRows, $index + 1, $totalPages, $index === 0, $index === $totalPages - 1);
        }
    }

    private function writePage(array $rows, int $pageNum, int $totalPages, bool $firstPage, bool $showTotals): void
    {
        $pageId = $this->nextId++;
        $contentId = $this->nextId++;
        $this->pageIds[] = $pageId;

        $content = '';
        $content .= $this->buildHeader();

        $y = $firstPage ? $this->buildStudentInfo($content) : $this->estimateContinuationLedgerTop();

        if ($firstPage && ($this->data['session_breakdown'] ?? []) !== []) {
            $y = $this->buildSessionBreakdown($content, $y);
        }

        $y = $this->buildLedgerHeader($content, $y);
        foreach ($rows as $row) {
            $y = $row['is_group']
                ? $this->buildGroupRow($content, $row, $y)
                : $this->buildDataRow($content, $row, $y);
        }

        if ($showTotals) {
            $y = $this->buildTotalRow($content, $y);
        }

        $this->buildFooter($content, $pageNum, $totalPages);

        $resources = '/Resources << /Font << /F1 3 0 R /F2 4 0 R >>';
        if ($this->logo) {
            $resources .= ' /XObject << /Im1 ' . $this->logo['object_id'] . ' 0 R >>';
        }
        $resources .= ' >>';

        $this->writeObject(
            $pageId,
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' . self::PW . ' ' . self::PH . '] ' .
            $resources . ' /Contents ' . $contentId . ' 0 R >>',
        );

        $stream = $this->compress($content);
        $this->writeObject($contentId, '<< /Length ' . strlen($stream) . " /Filter /FlateDecode >>\nstream\n{$stream}\nendstream");
    }

    private function buildHeader(): string
    {
        $content = '';
        $institution = $this->data['institution'] ?? [];
        $name = $this->string($institution['name'] ?? '', '');
        $centerX = self::ML + (self::CW / 2);
        $headerTop = self::PH - self::MT;
        $headerBottom = self::PH - self::MT - 58;

        $content .= $this->text(self::ML, $headerTop, 7, $this->generatedAt());

        if ($this->logo) {
            $maxWidth = 110.0;
            $maxHeight = 36.0;
            $scale = min($maxWidth / max(1, $this->logo['width']), $maxHeight / max(1, $this->logo['height']));
            $drawWidth = round($this->logo['width'] * $scale, 2);
            $drawHeight = round($this->logo['height'] * $scale, 2);
            $x = $centerX - ($drawWidth / 2);
            $y = self::PH - self::MT - 40;
            $content .= sprintf("q %.2F 0 0 %.2F %.2F %.2F cm /Im1 Do Q\n", $drawWidth, $drawHeight, $x, $y);
        }

        $textY = self::PH - self::MT - ($this->logo ? 48 : 18);
        if ($name !== '') {
            $content .= $this->text($centerX, $textY, 13, $name, self::BOLD, 'center');
            $textY -= 11;
        }

        foreach ($this->institutionLines($institution) as $line) {
            $content .= $this->text($centerX, $textY, 7.5, $this->truncate($line, 72), self::FONT, 'center');
            $textY -= 9;
        }

        $content .= $this->text($centerX, $headerBottom + 11, 10, 'FEE STATEMENT', self::BOLD, 'center');
        $content .= $this->line(self::ML, $headerBottom, self::PW - self::MR, $headerBottom);

        return $content;
    }

    private function buildStudentInfo(string &$content): float
    {
        $top = self::PH - self::MT - 78;
        if ($this->logo) {
            $top -= 18;
        }
        $rowHeight = 15.0;
        $left = self::ML;
        $widths = [90.0, 160.0, 94.0, self::CW - 90.0 - 160.0 - 94.0];
        $rows = [
            ['STUDENT NAME:', $this->student('name'), 'REG NO:', $this->student('admission_number')],
            ['PROGRAM:', $this->course('name'), 'ADMISSION YEAR:', $this->student('admission_year')],
            ['DEPARTMENT:', $this->course('department'), 'YEAR OF STUDY:', (string) $this->student('year_of_study')],
            ['SCHOOL/FACULTY:', $this->course('school') ?: $this->course('level'), '', ''],
            ['STUDENT TYPE:', $this->student('type', 'Regular'), '', ''],
        ];

        $content .= $this->drawTableGrid($left, $top, $widths, count($rows), $rowHeight);

        foreach ($rows as $index => $row) {
            $rowTop = $top - ($index * $rowHeight);
            $content .= $this->cellText($left + 4, $rowTop - 10, 7.5, $row[0], 18, self::BOLD);
            $content .= $this->cellText($left + $widths[0] + 4, $rowTop - 10, 7.5, $this->string($row[1]), 28);

            if ($row[2] !== '') {
                $content .= $this->cellText($left + $widths[0] + $widths[1] + 4, $rowTop - 10, 7.5, $row[2], 18, self::BOLD);
            }
            if ($row[3] !== '') {
                $content .= $this->cellText($left + $widths[0] + $widths[1] + $widths[2] + 4, $rowTop - 10, 7.5, $this->string($row[3]), 24);
            }
        }

        return $top - (count($rows) * $rowHeight) - 12;
    }

    private function buildSessionBreakdown(string &$content, float $y): float
    {
        $left = self::ML;
        $rowHeight = 15.0;
        $widths = [156.0, 74.0, 76.0, 76.0, self::CW - 156.0 - 74.0 - 76.0 - 76.0];
        $rows = $this->data['session_breakdown'] ?? [];

        $content .= $this->text($left, $y, 8, 'SESSION SUMMARY', self::BOLD);
        $y -= 9;
        $content .= $this->drawTableGrid($left, $y, $widths, count($rows) + 2, $rowHeight);

        $headers = ['Session', 'Status', 'Fees (KES)', 'Paid (KES)', 'Balance (KES)'];
        $x = $left;
        foreach ($headers as $i => $header) {
            $align = $i >= 2 ? 'center' : 'left';
            $textX = $align === 'center' ? $x + ($widths[$i] / 2) : $x + 4;
            $content .= $this->text($textX, $y - 10, 7.5, $header, self::BOLD, $align);
            $x += $widths[$i];
        }

        foreach ($rows as $index => $row) {
            $rowTop = $y - (($index + 1) * $rowHeight);
            $content .= $this->cellText($left + 4, $rowTop - 10, 7.2, (string) ($row['session_name'] ?? '-'), 28);
            $content .= $this->cellText($left + $widths[0] + 4, $rowTop - 10, 7.2, strtoupper((string) ($row['status'] ?? '-')), 12);
            $content .= $this->text($left + $widths[0] + $widths[1] + $widths[2] - 4, $rowTop - 10, 7.2, $this->money($row['fees'] ?? 0), self::FONT, 'right');
            $content .= $this->text($left + $widths[0] + $widths[1] + $widths[2] + $widths[3] - 4, $rowTop - 10, 7.2, $this->money($row['paid'] ?? 0), self::FONT, 'right');
            $content .= $this->text($left + array_sum($widths) - 4, $rowTop - 10, 7.2, $this->money($row['outstanding'] ?? 0), self::FONT, 'right');
        }

        $summary = $this->data['summary'] ?? [];
        $totalTop = $y - ((count($rows) + 1) * $rowHeight);
        $content .= $this->text($left + $widths[0] + $widths[1] - 4, $totalTop - 10, 7.5, 'TOTAL', self::BOLD, 'right');
        $content .= $this->text($left + $widths[0] + $widths[1] + $widths[2] - 4, $totalTop - 10, 7.5, $this->money($summary['total_invoiced'] ?? 0), self::BOLD, 'right');
        $content .= $this->text($left + $widths[0] + $widths[1] + $widths[2] + $widths[3] - 4, $totalTop - 10, 7.5, $this->money($summary['total_paid'] ?? 0), self::BOLD, 'right');
        $content .= $this->text($left + array_sum($widths) - 4, $totalTop - 10, 7.5, $this->money($summary['outstanding_balance'] ?? 0), self::BOLD, 'right');

        return $y - ((count($rows) + 2) * $rowHeight) - 12;
    }

    private function buildLedgerHeader(string &$content, float $y): float
    {
        $widths = $this->ledgerWidths();
        $content .= $this->drawTableGrid(self::ML, $y, $widths, 1, $this->tableHeaderHeight());

        $headers = ['No.', 'Date', 'Ref', 'Description', 'Debit (KES)', 'Credit (KES)', 'Balance (KES)'];
        $x = self::ML;
        foreach ($headers as $i => $header) {
            $align = $i >= 4 ? 'center' : 'left';
            $textX = $align === 'center' ? $x + ($widths[$i] / 2) : $x + 4;
            $content .= $this->text($textX, $y - 10.5, 7.3, $header, self::BOLD, $align);
            $x += $widths[$i];
        }

        return $y - $this->tableHeaderHeight();
    }

    private function buildGroupRow(string &$content, array $row, float $y): float
    {
        $height = $this->groupRowHeight();
        $content .= $this->rect(self::ML, $y - $height, self::CW, $height);
        $content .= $this->cellText(self::ML + 4, $y - 10, 7.2, $this->string($row['label']), 82, self::BOLD);
        return $y - $height;
    }

    private function buildDataRow(string &$content, array $row, float $y): float
    {
        $height = $this->rowHeight();
        $widths = $this->ledgerWidths();
        $content .= $this->drawTableGrid(self::ML, $y, $widths, 1, $height);

        $content .= $this->text(self::ML + 4, $y - 10, 7.0, $this->truncate((string) $row['number'], 4));
        $content .= $this->cellText(self::ML + $widths[0] + 3, $y - 10, 7.0, (string) $row['date'], 10);
        $content .= $this->cellText(self::ML + $widths[0] + $widths[1] + 3, $y - 10, 7.0, (string) $row['reference'], 10);
        $content .= $this->cellText(self::ML + $widths[0] + $widths[1] + $widths[2] + 3, $y - 10, 6.9, (string) $row['description'], 34);

        $moneyStart = self::ML + $widths[0] + $widths[1] + $widths[2] + $widths[3];
        $content .= $this->text($moneyStart + $widths[4] - 4, $y - 10, 7.0, $row['debit'] > 0 ? $this->money($row['debit']) : '', self::FONT, 'right');
        $content .= $this->text($moneyStart + $widths[4] + $widths[5] - 4, $y - 10, 7.0, $row['credit'] > 0 ? $this->money($row['credit']) : '', self::FONT, 'right');
        $content .= $this->text($moneyStart + $widths[4] + $widths[5] + $widths[6] - 4, $y - 10, 7.0, $this->money($row['balance']), self::FONT, 'right');

        return $y - $height;
    }

    private function buildTotalRow(string &$content, float $y): float
    {
        $height = $this->totalRowHeight();
        $widths = $this->ledgerWidths();
        $summary = $this->data['summary'] ?? [];

        $content .= $this->drawTableGrid(self::ML, $y, $widths, 1, $height);
        $content .= $this->text(
            self::ML + $widths[0] + $widths[1] + $widths[2] + $widths[3] - 4,
            $y - 10.5,
            7.5,
            'TOTAL',
            self::BOLD,
            'right'
        );

        $moneyStart = self::ML + $widths[0] + $widths[1] + $widths[2] + $widths[3];
        $content .= $this->text($moneyStart + $widths[4] - 4, $y - 10.5, 7.5, $this->money($summary['total_debit'] ?? 0), self::BOLD, 'right');
        $content .= $this->text($moneyStart + $widths[4] + $widths[5] - 4, $y - 10.5, 7.5, $this->money($summary['total_credit'] ?? 0), self::BOLD, 'right');
        $content .= $this->text($moneyStart + $widths[4] + $widths[5] + $widths[6] - 4, $y - 10.5, 7.5, $this->money($summary['ledger_balance'] ?? 0), self::BOLD, 'right');

        return $y - $height;
    }

    private function buildFooter(string &$content, int $pageNum, int $totalPages): void
    {
        $institution = $this->data['institution'] ?? [];
        $lineY = self::MB + 14;

        $content .= $this->line(self::ML, $lineY + 8, self::PW - self::MR, $lineY + 8);
        $content .= $this->text(self::ML, $lineY, 7, $this->string($institution['name'] ?? '', ''));
        $content .= $this->text(self::PW - self::MR, $lineY, 7, "Page {$pageNum} of {$totalPages}", self::FONT, 'right');
    }

    private function buildTransactionRows(): array
    {
        $rows = [];
        $transactions = $this->data['transactions'] ?? [];

        foreach ($transactions as $index => $transaction) {
            $previous = $transactions[$index - 1] ?? null;
            $changed = $index === 0 || (($transaction['academic_session_id'] ?? null) !== ($previous['academic_session_id'] ?? null));

            if ($changed) {
                $rows[] = [
                    'is_group' => true,
                    'label' => $transaction['session_label'] ?? 'OTHER TRANSACTIONS',
                ];
            }

            $rows[] = [
                'is_group' => false,
                'number' => $transaction['number'] ?? (string) ($index + 1),
                'date' => $transaction['date'] ?? '-',
                'reference' => $transaction['reference'] ?? '-',
                'description' => $transaction['description'] ?? '',
                'debit' => (float) ($transaction['debit'] ?? 0),
                'credit' => (float) ($transaction['credit'] ?? 0),
                'balance' => (float) ($transaction['balance'] ?? 0),
            ];
        }

        return $rows;
    }

    private function takeRowsForHeight(array &$rows, float $availableHeight): array
    {
        if ($rows === []) {
            return [];
        }

        $taken = [];
        $used = 0.0;
        while ($rows !== []) {
            $nextHeight = $rows[0]['is_group'] ? $this->groupRowHeight() : $this->rowHeight();
            if ($taken !== [] && ($used + $nextHeight) > $availableHeight) {
                break;
            }

            $taken[] = array_shift($rows);
            $used += $nextHeight;
        }

        return $taken;
    }

    private function estimateFirstPageLedgerTop(): float
    {
        $top = self::PH - self::MT - 78;
        if ($this->logo) {
            $top -= 18;
        }
        $top -= (5 * 15.0) + 12;

        $sessions = $this->data['session_breakdown'] ?? [];
        if ($sessions !== []) {
            $top -= 9;
            $top -= (count($sessions) + 2) * 15.0;
            $top -= 12;
        }

        return $top;
    }

    private function estimateContinuationLedgerTop(): float
    {
        return self::PH - self::MT - 30;
    }

    private function ledgerWidths(): array
    {
        return [28.0, 56.0, 56.0, 180.0, 58.0, 58.0, 58.28];
    }

    private function tableHeaderHeight(): float
    {
        return 16.0;
    }

    private function groupRowHeight(): float
    {
        return 14.0;
    }

    private function rowHeight(): float
    {
        return 15.0;
    }

    private function totalRowHeight(): float
    {
        return 16.0;
    }

    private function contentBottom(): float
    {
        return self::MB + 28;
    }

    private function institutionLines(array $institution): array
    {
        $lines = [];
        if (! empty($institution['postal_address'])) {
            $lines[] = $institution['postal_address'];
        }
        if (! empty($institution['telephone'])) {
            $lines[] = 'TEL: ' . $institution['telephone'];
        }
        if (! empty($institution['email'])) {
            $lines[] = 'Email: ' . $institution['email'];
        }
        if (! empty($institution['website'])) {
            $lines[] = 'Web: ' . $institution['website'];
        }

        return $lines;
    }

    private function generatedAt(): string
    {
        return $this->string($this->data['generated_at'] ?? now()->format('d/m/Y H:i'));
    }

    private function student(string $key, string $default = '-'): string
    {
        return $this->string($this->data['student'][$key] ?? $default);
    }

    private function course(string $key, string $default = '-'): string
    {
        return $this->string($this->data['course'][$key] ?? $default);
    }

    private function money($value): string
    {
        return number_format((float) $value, 2);
    }

    private function string($value, string $default = '-'): string
    {
        $text = trim((string) ($value ?? ''));
        return $text === '' ? $default : $text;
    }

    private function drawTableGrid(float $left, float $top, array $widths, int $rows, float $rowHeight): string
    {
        $totalWidth = array_sum($widths);
        $totalHeight = $rows * $rowHeight;
        $content = $this->rect($left, $top - $totalHeight, $totalWidth, $totalHeight);

        $x = $left;
        foreach ($widths as $index => $width) {
            $x += $width;
            if ($index < count($widths) - 1) {
                $content .= $this->line($x, $top, $x, $top - $totalHeight);
            }
        }

        for ($i = 1; $i < $rows; $i++) {
            $y = $top - ($i * $rowHeight);
            $content .= $this->line($left, $y, $left + $totalWidth, $y);
        }

        return $content;
    }

    private function rect(float $x, float $y, float $width, float $height): string
    {
        return sprintf("%.2F %.2F %.2F %.2F re S\n", $x, $y, $width, $height);
    }

    private function line(float $x1, float $y1, float $x2, float $y2): string
    {
        return sprintf("%.2F %.2F m %.2F %.2F l S\n", $x1, $y1, $x2, $y2);
    }

    private function compress(string $content): string
    {
        $compressed = gzcompress($content);
        return $compressed === false ? $content : $compressed;
    }

    private function write(string $value): int
    {
        $written = fwrite($this->output, $value);
        if ($written === false) {
            throw new RuntimeException('Write failed.');
        }

        $this->offset += $written;
        return $written;
    }

    private function writeObject(int $id, string $body): void
    {
        $this->offsets[$id] = $this->offset;
        $this->write("{$id} 0 obj\n{$body}\nendobj\n");
    }

    private function truncate(string $value, int $max): string
    {
        $clean = preg_replace('/\s+/', ' ', trim($value)) ?? '';
        if (mb_strlen($clean) <= $max) {
            return $clean;
        }

        return mb_substr($clean, 0, max(1, $max - 3)) . '...';
    }

    private function cellText(float $x, float $y, float $size, string $value, int $maxChars, int $font = self::FONT): string
    {
        return $this->text($x, $y, $size, $this->truncate($value, $maxChars), $font);
    }

    private function text(float $x, float $y, float $size, string $value, int $font = self::FONT, string $align = 'left'): string
    {
        $encoded = iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $value);
        if ($encoded === false) {
            $encoded = '';
        }

        $encoded = str_replace(['\\', '(', ')', "\r", "\n"], ['\\\\', '\\(', '\\)', ' ', ' '], $encoded);
        $fontName = $font === self::BOLD ? 'F2' : 'F1';
        $width = mb_strlen($encoded) * $size * 0.28;

        if ($align === 'right') {
            $x -= $width;
        } elseif ($align === 'center') {
            $x -= $width / 2;
        }

        return sprintf("BT /%s %.2F Tf %.2F %.2F Td (%s) Tj ET\n", $fontName, $size, $x, $y, $encoded);
    }
}
