<?php

namespace App\Exports;

use Generator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DataExportService
{
    private const CHUNK_SIZE = 500;

    public function export(
        Builder $query,
        array $columns,
        string $format,
        string $filename,
        ?callable $pdfRenderer = null,
        string $pdfTitle = '',
    ): StreamedResponse {
        return match ($format) {
            'csv' => $this->exportCsv($query, $columns, $filename),
            'xlsx' => $this->exportXlsx($query, $columns, $filename),
            'pdf' => $this->exportPdf($query, $columns, $filename, $pdfRenderer, $pdfTitle),
            default => $this->exportCsv($query, $columns, $filename),
        };
    }

    private function headers(array $columns): array
    {
        return array_map(fn (array $col) => $col['key'], $columns);
    }

    private function rows(Builder $query, array $columns): Generator
    {
        DB::connection()->disableQueryLog();

        foreach ($query->lazy(self::CHUNK_SIZE) as $model) {
            yield array_map(fn (array $col) => (string) ($col['value'])($model), $columns);
        }
    }

    private function exportCsv(Builder $query, array $columns, string $filename): StreamedResponse
    {
        return Response::streamDownload(function () use ($query, $columns) {
            $output = fopen('php://output', 'wb');

            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, $this->headers($columns), ',', '"', '');

            foreach ($this->rows($query, $columns) as $row) {
                fputcsv($output, array_map($this->safeSpreadsheetValue(...), $row), ',', '"', '');
            }

            fclose($output);
        }, $this->fileName($filename, 'csv'), $this->downloadHeaders('text/csv; charset=UTF-8'));
    }

    private function exportXlsx(Builder $query, array $columns, string $filename): StreamedResponse
    {
        return Response::streamDownload(function () use ($query, $columns) {
            $writer = new Writer;
            $writer->openToFile('php://output');
            $writer->addRow(Row::fromValues($this->headers($columns)));

            foreach ($this->rows($query, $columns) as $row) {
                $writer->addRow(Row::fromValues($row));
            }

            $writer->close();
        }, $this->fileName($filename, 'xlsx'), $this->downloadHeaders(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ));
    }

    private function exportPdf(
        Builder $query,
        array $columns,
        string $filename,
        ?callable $pdfRenderer,
        string $pdfTitle,
    ): StreamedResponse {
        if ($pdfRenderer === null) {
            throw new \InvalidArgumentException('A PDF renderer callback is required for PDF export.');
        }

        $title = $pdfTitle ?: $filename;

        return Response::streamDownload(function () use ($query, $columns, $pdfRenderer, $title) {
            $pdfRenderer($this->headers($columns), $this->rows($query, $columns), $title);
        }, $this->fileName($filename, 'pdf'), $this->downloadHeaders('application/pdf'));
    }

    private function safeSpreadsheetValue(mixed $value): string
    {
        $value = (string) $value;

        return preg_match('/^[\x00-\x20]*[=+\-@]/', $value) === 1 ? "'{$value}" : $value;
    }

    private function fileName(string $base, string $extension): string
    {
        return "{$base}_".now()->format('Ymd_His').".{$extension}";
    }

    private function downloadHeaders(string $contentType): array
    {
        return [
            'Content-Type' => $contentType,
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Accel-Buffering' => 'no',
        ];
    }
}
