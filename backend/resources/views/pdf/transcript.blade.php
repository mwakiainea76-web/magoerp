<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Transcript - {{ $student['admission_number'] ?? 'Student' }}</title>
@php
    $logoPath = $institution['logo_path'] ?? null;
    $logoDataUri = $logoPath && is_file($logoPath)
        ? 'data:image/' . pathinfo($logoPath, PATHINFO_EXTENSION) . ';base64,' . base64_encode(file_get_contents($logoPath))
        : null;
    $transcript = collect($transcript ?? [])->values();
@endphp
<style>
@page { size: A4 portrait; margin: 16mm 12mm 18mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 8.2pt; line-height: 1.28; color: #111111; margin: 0; }
.page { position: relative; min-height: 257mm; }
.header { text-align: center; }
.header img { display: block; margin: 0 auto 2mm; max-width: 54mm; max-height: 18mm; }
.header p { margin: 0.3mm 0 0; font-size: 7.5pt; }
.office { margin-top: 2.2mm; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #374151; }
.title { margin-top: 1mm; font-size: 11pt; font-weight: 700; color: #000000; }
.rule { margin-top: 2.5mm; border-top: 1px solid #000000; }
.content { padding-bottom: 58mm; }
.section-title { margin: 4mm 0 1.8mm; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #000000; }
.info-table { width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 8pt; line-height: 1.4; }
.info-table col.col-label-left { width: 120px; }
.info-table col.col-value-left { width: auto; }
.info-table col.col-label-right { width: 130px; }
.info-table col.col-value-right { width: auto; }
.info-table td { padding: 1.7mm 2mm; vertical-align: top; }
.info-table tr + tr td { border-top: 1px solid #cbd5e1; }
.info-table td.label { font-weight: 700; color: #374151; }
.info-table td.label-right,
.info-table td.value-right { border-left: 1px solid #cbd5e1; }
.record-wrap { border: 1px solid #000000; }
.record-table { width: 100%; border-collapse: collapse; font-size: 8pt; line-height: 1.25; }
.record-table th,
.record-table td { border: 1px solid #64748b; padding: 1.7mm 1.8mm; vertical-align: top; }
.record-table thead th { font-weight: 700; text-align: left; background: #ffffff; }
.record-table .hours,
.record-table .grade { text-align: right; }
.bottom-panel { position: absolute; left: 0; right: 0; bottom: 0; }
.legend-table { width: 210px; border-collapse: collapse; font-size: 7.8pt; line-height: 1.25; }
.legend-table th,
.legend-table td { padding: 0.5mm 0; text-align: left; vertical-align: top; }
.legend-table th:first-child,
.legend-table td:first-child { width: 72px; }
.footer-meta { margin-top: 9mm; font-size: 7.5pt; line-height: 1.35; color: #1f2937; }
.signature-table { width: 100%; border-collapse: collapse; }
.signature-table td { vertical-align: bottom; padding: 0; }
.signature-table .sig-line { border-bottom: 1px solid #334155; height: 10px; }
.signature-table .spacer { width: 4mm; }
.footer-line { margin-top: 2.2mm; }
.footer-line table { width: 100%; border-collapse: collapse; font-size: 7.3pt; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }
.footer-line td:last-child { text-align: right; }
.disclaimer { margin-top: 1.6mm; border-top: 1px solid #334155; padding-top: 1.6mm; }
.empty-row { text-align: center; padding: 8mm 0; }
</style>
</head>
<body>
<div class="page">
    <div class="content">
        <header class="header">
            @if($logoDataUri)
                <img src="{{ $logoDataUri }}" alt="Institution logo">
            @endif
            @if($institution['postal_address'] ?? false)
                <p>{{ $institution['postal_address'] }}</p>
            @endif
            @if($institution['telephone'] ?? false)
                <p>TEL: {{ $institution['telephone'] }}</p>
            @endif
            @if(($institution['email'] ?? false) || ($institution['website'] ?? false))
                <p>
                    @if($institution['email'] ?? false)Email: {{ $institution['email'] }}@endif
                    @if(($institution['email'] ?? false) && ($institution['website'] ?? false)) | @endif
                    @if($institution['website'] ?? false)Web: {{ $institution['website'] }}@endif
                </p>
            @endif
            <p class="office">Office of the Registrar - Academics</p>
            <p class="title">Provisional Transcript</p>
        </header>

        <div class="rule"></div>

        <p class="section-title">Student Information</p>
        <table class="info-table">
            <colgroup>
                <col class="col-label-left">
                <col class="col-value-left">
                <col class="col-label-right">
                <col class="col-value-right">
            </colgroup>
            <tbody>
                <tr>
                    <td class="label">Name:</td>
                    <td>{{ $student['name'] ?? '-' }}</td>
                    <td class="label label-right">Reg No:</td>
                    <td class="value-right">{{ $student['admission_number'] ?? '-' }}</td>
                </tr>
                <tr>
                    <td class="label">School:</td>
                    <td>{{ $course['school'] ?? $course['department'] ?? $course['certification_authority'] ?? '-' }}</td>
                    <td class="label label-right">Program:</td>
                    <td class="value-right">{{ $course['name'] ?? '-' }}</td>
                </tr>
                <tr>
                    <td class="label">Class:</td>
                    <td>{{ $student_meta['class_name'] ?? (($student_meta['session_number'] ?? null) ? 'Session ' . $student_meta['session_number'] : '-') }}</td>
                    <td class="label label-right">Admission Year:</td>
                    <td class="value-right">{{ $student_meta['admission_year'] ?? '-' }}</td>
                </tr>
                <tr>
                    <td class="label">Year of Study:</td>
                    <td>{{ $student_meta['year_of_study_label'] ?? '-' }}</td>
                    <td class="label label-right"></td>
                    <td class="value-right"></td>
                </tr>
            </tbody>
        </table>

        <p class="section-title">Academic Record</p>
        <div class="record-wrap">
            <table class="record-table">
                <thead>
                    <tr>
                        <th style="width: 18%;">Unit Code</th>
                        <th style="width: 55%;">Unit Name</th>
                        <th class="hours" style="width: 9%;">Hours</th>
                        <th class="hours" style="width: 9%;">Score</th>
                        <th class="grade" style="width: 9%;">Grade</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($transcript as $entry)
                        <tr>
                            <td>{{ data_get($entry, 'unit.code', '-') }}</td>
                            <td>{{ data_get($entry, 'unit.name', '-') }}</td>
                            <td class="hours">{{ data_get($entry, 'unit.taught_hours', '-') }}</td>
                            <td class="hours">{{ data_get($entry, 'marks', '-') }}</td>
                            <td class="grade">{{ data_get($entry, 'grade', '-') }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="empty-row">No published transcript records found for the selected filters.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <div class="bottom-panel">
        <table class="legend-table">
            <thead>
                <tr>
                    <th>Grade</th>
                    <th>Points</th>
                </tr>
            </thead>
            <tbody>
                @forelse($grade_legend ?? [] as $entry)
                    <tr>
                        <td><strong>{{ $entry['grade'] ?? '-' }}</strong></td>
                        <td>{{ $entry['points'] ?? '-' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="2">No grade bands configured.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="footer-meta">
            <table class="signature-table">
                <tr>
                    <td style="width: 28mm;">Registrar Academics</td>
                    <td class="sig-line"></td>
                    <td class="spacer"></td>
                    <td style="width: 24mm;">Date Generated</td>
                    <td class="sig-line" style="width: 34mm; text-align: center;">{{ $generated_at ?? now()->format('d/m/Y H:i') }}</td>
                </tr>
            </table>
            <div class="footer-line">
                <table>
                    <tr>
                        <td>Document Ref: {{ $transcript_reference ?? 'TR-NA' }}</td>
                    </tr>
                </table>
            </div>
            <div class="disclaimer">This result slip is issued without any erasures or alterations. Not valid without official stamp.</div>
        </div>
    </div>
</div>
</body>
</html>
