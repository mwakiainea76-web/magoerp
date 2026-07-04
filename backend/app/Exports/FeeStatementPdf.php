<?php

namespace App\Exports;

use RuntimeException;

class FeeStatementPdf
{
    private const PW = 595.28;
    private const PH = 841.89;
    private const ML = 42;
    private const MR = 42;
    private const CW = 511.28;

    private $output;
    private int $offset = 0;
    private array $offsets = [];
    private array $pageIds = [];
    private int $nextId = 5;

    private array $data;

    private const FONT = 3;
    private const BOLD = 4;

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

        $this->renderPages();

        $kids = implode(' ', array_map(fn (int $id) => "{$id} 0 R", $this->pageIds));
        $obj(2, '<< /Type /Pages /Kids ['.$kids.'] /Count '.count($this->pageIds).' >>');

        $xref = $this->offset;
        $maxId = max(array_keys($this->offsets));
        $w("xref\n0 ".($maxId + 1)."\n");
        $w("0000000000 65535 f \n");
        for ($id = 1; $id <= $maxId; $id++) {
            $w(sprintf("%010d 00000 n \n", $this->offsets[$id]));
        }
        $w("trailer\n<< /Size ".($maxId + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF\n");
        fclose($this->output);
    }

    private function write(string $value): int
    {
        $written = fwrite($this->output, $value);
        if ($written === false) throw new RuntimeException('Write failed.');
        $this->offset += $written;
        return $written;
    }

    private function writeObject(int $id, string $body): void
    {
        $this->offsets[$id] = $this->offset;
        $this->write("{$id} 0 obj\n{$body}\nendobj\n");
    }

    private function renderPages(): void
    {
        $rows = $this->buildTransactionRows();
        $headerHeight = 162;
        $rowH = 18;
        $groupH = 16;
        $footerH = 24;
        $availH = self::PH - $headerHeight - $footerH;
        $maxRows = (int) floor($availH / $rowH);

        $chunks = array_chunk($rows, $maxRows);
        if ($chunks === []) $chunks = [[]];

        $pageNum = 1;
        $total = count($chunks);

        foreach ($chunks as $chunk) {
            if ($pageNum < $total) {
                $this->writePage($chunk, $pageNum, false);
            } else {
                $this->writePage($chunk, $pageNum, true);
            }
            $pageNum++;
        }
    }

    private function writePage(array $rows, int $pageNum, bool $showTotals): void
    {
        $pageId = $this->nextId++;
        $contentId = $this->nextId++;
        $this->pageIds[] = $pageId;

        $content = $this->buildHeader($pageNum);

        $y = self::PH - 162;

        if ($pageNum === 1) {
            $y = $this->buildStudentInfo($content, $y);
        }

        $y = $this->buildScopeLine($content, $y);

        if ($pageNum === 1 && ($this->data['dormant_fees'] ?? [])) {
            $y = $this->buildDormantLine($content, $y);
        }

        $y = $this->buildTableHeader($content, $y);
        $rowH = 18;

        foreach ($rows as $row) {
            if ($row['is_group']) {
                $y = $this->buildGroupRow($content, $row, $y);
            } else {
                $y = $this->buildDataRow($content, $row, $y, $rowH);
            }
        }

        if ($showTotals) {
            $y = $this->buildTotalRow($content, $y);
        }

        $this->buildFooter($content);

        $this->writeObject(
            $pageId,
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '.self::PW.' '.self::PH.'] '.
            '/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '.$contentId.' 0 R >>',
        );

        $stream = $this->compress($content);
        $this->writeObject($contentId, '<< /Length '.strlen($stream)." /Filter /FlateDecode >>\nstream\n{$stream}\nendstream");
    }

    private function compress(string $content): string
    {
        $compressed = gzcompress($content);
        return $compressed === false ? $content : $compressed;
    }

    private function buildHeader(int $pageNum): string
    {
        $c = '';
        $inst = $this->data['institution'] ?? [];
        $name = $inst['name'] ?? 'INSTITUTION';
        $addr = $inst['postal_address'] ?? '';
        $phone = $inst['telephone'] ?? '';
        $email = $inst['email'] ?? '';
        $web = $inst['website'] ?? '';
        $left = self::ML;

        $c .= "0.12 0.17 0.22 rg\n";
        $c .= $this->text($left, self::PH - 22, 7, 'Generated ' . now()->format('d/m/Y H:i'));
        $c .= $this->text(self::PW - self::MR - 80, self::PH - 22, 7, 'Page ' . $pageNum);

        $c .= "0.055 0.145 0.235 rg\n";
        $c .= sprintf("%.2F %.2F %.2F 46 re f\n", $left, self::PH - 70, self::CW, 46);
        $c .= "1 1 1 rg\n";
        $c .= $this->text($left + 10, self::PH - 44, 14, $name, self::BOLD);

        $contacts = array_filter([$addr, $phone, $email, $web]);
        if ($contacts) {
            $c .= "0.78 0.86 0.91 rg\n";
            $c .= $this->text($left + 10, self::PH - 60, 7, implode('  |  ', $contacts));
        }

        $c .= "0.12 0.17 0.22 rg\n";
        $c .= $this->text($left, self::PH - 82, 10, 'FEE STATEMENT', self::BOLD);

        $c .= sprintf("0.55 0.58 0.62 RG %.2F %.2F %.2F %.2F re S\n", $left, self::PH - 88, self::CW, 0);

        return $c;
    }

    private function buildStudentInfo(string &$c, float $y): float
    {
        $left = self::ML;
        $w2 = self::CW / 2;
        $s = $this->data['student'] ?? [];
        $course = $this->data['course'] ?? [];
        $rh = 14;

        $c .= "0.08 0.12 0.16 rg\n";

        $items = [
            ['STUDENT NAME:', $s['name'] ?? '-', 'REG NO:', $s['admission_number'] ?? '-'],
            ['PROGRAM:', $course['name'] ?? '-', 'ADMISSION YEAR:', $s['admission_year'] ?? '-'],
            ['DEPARTMENT:', $course['department'] ?? '-', 'YEAR OF STUDY:', (string) ($s['year_of_study'] ?? '-')],
            ['SCHOOL:', $course['school'] ?? $course['level'] ?? '-', 'TERM:', (string) ($s['term'] ?? '-')],
            ['TYPE:', $s['type'] ?? 'Regular', '', ''],
        ];

        foreach ($items as $i => $row) {
            $rowY = $y - $i * $rh;
            $c .= sprintf("0.92 0.94 0.96 rg %.2F %.2F %.2F %.2F re f\n", $left, $rowY - $rh, self::CW, $rh);
            $c .= $this->text($left + 4, $rowY - 4, 8, $row[0], self::BOLD);
            $c .= $this->text($left + 58, $rowY - 4, 8, $row[1]);
            if ($row[2]) {
                $c .= $this->text($left + $w2 + 4, $rowY - 4, 8, $row[2], self::BOLD);
                $c .= $this->text($left + $w2 + 62, $rowY - 4, 8, $row[3]);
            }
        }

        return $y - count($items) * $rh - 4;
    }

    private function buildScopeLine(string &$c, float $y): float
    {
        $scope = $this->data['statement_mode']['scope'] ?? 'session_to_date';
        $label = str_replace(['_', '-'], ' ', ucwords($scope, '_'));
        $c .= $this->text(self::ML, $y - 10, 8, 'SCOPE: ' . $label, self::BOLD);
        return $y - 18;
    }

    private function buildDormantLine(string &$c, float $y): float
    {
        $total = collect($this->data['dormant_fees'] ?? [])->sum('amount');
        $c .= $this->text(self::ML, $y - 10, 8, 'DORMANT FUTURE FEES: KES ' . number_format($total, 2), self::BOLD);
        return $y - 18;
    }

    private function buildTableHeader(string &$c, float $y): float
    {
        $cols = [26, 60, 60, 155, 70, 70, 70];
        $x = self::ML;
        $rh = 18;

        $c .= sprintf("0.075 0.36 0.40 rg %.2F %.2F %.2F %.2F re f\n", $x, $y - $rh, self::CW, $rh);
        $c .= "1 1 1 rg\n";

        $headers = ['#', 'Date', 'Ref', 'Description', 'Debit (KES)', 'Credit (KES)', 'Balance (KES)'];
        $cx = $x;
        foreach ($headers as $i => $h) {
            $c .= $this->text($cx + 4, $y - 4, 7.5, $h, self::BOLD);
            $cx += $cols[$i];
        }

        return $y - $rh;
    }

    private function buildGroupRow(string &$c, array $row, float $y): float
    {
        $rh = 16;
        $c .= sprintf("0.85 0.90 0.93 rg %.2F %.2F %.2F %.2F re f\n", self::ML, $y - $rh, self::CW, $rh);
        $c .= "0.12 0.17 0.22 rg\n";
        $c .= $this->text(self::ML + 4, $y - 4, 7.5, $row['label'], self::BOLD);
        return $y - $rh;
    }

    private function buildDataRow(string &$c, array $row, float $y, float $rh): float
    {
        $cols = [26, 60, 60, 155, 70, 70, 70];
        $x = self::ML;
        $alt = $row['index'] % 2 === 0;

        if ($alt) {
            $c .= sprintf("0.96 0.97 0.98 rg %.2F %.2F %.2F %.2F re f\n", $x, $y - $rh, self::CW, $rh);
        }

        $c .= "0.12 0.17 0.22 rg\n";

        $values = [
            (string) $row['number'],
            $row['date'],
            $row['reference'],
            $this->truncate($row['description'], 28),
            $row['debit'] > 0 ? number_format($row['debit'], 2) : '',
            $row['credit'] > 0 ? number_format($row['credit'], 2) : '',
            number_format($row['balance'], 2),
        ];

        $cx = $x;
        foreach ($values as $i => $v) {
            $align = $i >= 4 ? $cx + $cols[$i] - 6 : $cx + 4;
            $c .= $this->text($align, $y - 4, 7, $v, self::FONT, $i >= 4 ? 'right' : 'left');
            $cx += $cols[$i];
        }

        return $y - $rh;
    }

    private function buildTotalRow(string &$c, float $y): float
    {
        $cols = [26, 60, 60, 155, 70, 70, 70];
        $rh = 20;

        $c .= sprintf("0.92 0.94 0.96 rg %.2F %.2F %.2F %.2F re f\n", self::ML, $y - $rh, self::CW, $rh);

        $tDebit = 0;
        $tCredit = 0;
        foreach ($this->buildTransactionRows() as $r) {
            if (!$r['is_group']) {
                $tDebit += $r['debit'];
                $tCredit += $r['credit'];
            }
        }
        $lastBalance = 0;
        foreach ($this->buildTransactionRows() as $r) {
            if (!$r['is_group']) $lastBalance = $r['balance'];
        }

        $cx = self::ML;
        $c .= $this->text($cx + $cols[0] + $cols[1] + $cols[2] + 4, $y - 4, 8, 'TOTAL', self::BOLD);
        $cx += $cols[0] + $cols[1] + $cols[2] + $cols[3];
        $c .= $this->text($cx + $cols[3] - 6, $y - 4, 8, number_format($tDebit, 2), self::BOLD, 'right');
        $cx += $cols[3];
        $c .= $this->text($cx + $cols[4] - 6, $y - 4, 8, number_format($tCredit, 2), self::BOLD, 'right');
        $cx += $cols[4];
        $c .= $this->text($cx + $cols[5] - 6, $y - 4, 8, number_format($lastBalance, 2), self::BOLD, 'right');

        return $y - $rh;
    }

    private function buildFooter(string &$c): void
    {
        $inst = $this->data['institution'] ?? [];
        $name = $inst['name'] ?? 'INSTITUTION';
        $left = self::ML;

        $c .= sprintf("0.55 0.58 0.62 RG %.2F 36 m %.2F 36 l S\n", $left, $left + self::CW);
        $c .= "0.38 0.44 0.49 rg\n";
        $c .= $this->text($left, 26, 7, $name);
        $c .= $this->text($left + self::CW - 80, 26, 7, 'Fee Statement');
    }

    private function buildTransactionRows(): array
    {
        $rows = [];
        $transactions = $this->data['transactions'] ?? [];

        foreach ($transactions as $i => $t) {
            $prev = $transactions[$i - 1] ?? null;
            $changed = $i === 0 || ($t['academic_session_id'] !== ($prev['academic_session_id'] ?? null));

            if ($changed) {
                $rows[] = [
                    'is_group' => true,
                    'label' => $t['session_label'] ?? 'OTHER TRANSACTIONS',
                ];
            }

            $rows[] = [
                'is_group' => false,
                'index' => $i,
                'number' => $t['number'],
                'date' => $t['date'] ?? '-',
                'reference' => $t['reference'] ?? '-',
                'description' => $t['description'] ?? '',
                'debit' => (float) ($t['debit'] ?? 0),
                'credit' => (float) ($t['credit'] ?? 0),
                'balance' => (float) ($t['balance'] ?? 0),
            ];
        }

        return $rows;
    }

    private function truncate(string $value, int $max): string
    {
        if (mb_strlen($value) <= $max) return $value;
        return mb_substr($value, 0, max(1, $max - 3)) . '...';
    }

    private function text(float $x, float $y, float $size, string $value, int $font = 3, string $align = 'left'): string
    {
        $encoded = iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $value);
        if ($encoded === false) $encoded = '';
        $encoded = str_replace(['\\', '(', ')', "\r", "\n"], ['\\\\', '\\(', '\\)', ' ', ' '], $encoded);

        $fn = $font === self::BOLD ? 'F2' : 'F1';

        if ($align === 'right') {
            $width = mb_strlen($encoded) * $size * 0.28;
            $x -= $width;
        }

        return sprintf("BT /%s %.2F Tf %.2F %.2F Td (%s) Tj ET\n", $fn, $size, $x, $y, $encoded);
    }
}
