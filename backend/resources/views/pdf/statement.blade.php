<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fee Statement - {{ $student['admission_number'] }}</title>
@php
    $logoPath = resource_path('pdf-logo.jpg');
    $logoDataUri = is_file($logoPath)
        ? 'data:image/jpeg;base64,' . base64_encode(file_get_contents($logoPath))
        : null;
@endphp
<style>
@page{size:A4 portrait;margin:18mm 12mm 18mm}
body{font-family:Arial,Helvetica,sans-serif;font-size:8pt;line-height:1.25;color:#111;margin:0}
.statement-generated-at{margin:0 0 2.5mm;font-size:7pt}
.statement-header{text-align:center}
.statement-header img{max-width:54mm;max-height:18mm;margin:0 auto 2.5mm;display:block}
.statement-header h1{margin:0;font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:.02em}
.statement-header p{margin:.4mm 0 0;font-size:7.5pt}
.statement-header h2{margin:2.8mm 0 0;font-size:10pt;font-weight:700;letter-spacing:.08em}
.statement-rule{margin-top:2.2mm;border-top:1px solid #000}
.statement-details{width:100%;margin-top:1.8mm;border-collapse:collapse;table-layout:fixed}
.statement-details col:nth-child(1){width:15%}
.statement-details col:nth-child(2){width:37%}
.statement-details col:nth-child(3){width:14%}
.statement-details col:nth-child(4){width:34%}
.statement-details th,.statement-details td{border:1px solid #000;padding:1.35mm 1.2mm;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere}
.statement-details th{font-size:7.4pt;font-weight:700;text-align:left}
.statement-details td{font-size:7.4pt}
tbody{
  margin-top: 50px;
}
.statement-ledger{width:100%;margin-top:2.4mm;border-collapse:collapse;table-layout:fixed}
.statement-ledger th,.statement-ledger td{border:1px solid #000;padding:1.3mm 1mm;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere}
.statement-ledger thead th{text-align:left;font-size:7.1pt;font-weight:700;vertical-align:middle}
.statement-number{width:6%}
.statement-date{width:12%}
.statement-reference{width:13%}
.statement-description{width:31%}
.statement-money{width:12.6%;text-align:center}
.statement-session-row th{padding:1.3mm 1mm;text-align:left;font-size:7.2pt;font-weight:700;text-transform:uppercase;background:#f3f4f6}
.statement-transaction-row td{font-size:7pt}
.statement-amount{text-align:right;white-space:nowrap}
.statement-empty{padding:8mm!important;text-align:center}
.statement-total-row th,.statement-total-row td{font-size:7.2pt;font-weight:700}
.statement-total-row th{text-align:right}
.statement-footer{position:fixed;left:0;right:0;bottom:-10mm;font-size:7pt;text-transform:uppercase}
.statement-footer-line{border-top:1px solid #000;padding-top:1.6mm;display:flex;justify-content:space-between;align-items:center}
</style>
</head>
<body>
<p class="statement-generated-at">{{ $generated_at ?? now()->format('d/m/Y H:i') }}</p>
<header class="statement-header">
@if($logoDataUri)<img src="{{ $logoDataUri }}" alt="Institution logo">@endif

@if($institution['postal_address'] ?? false)<p>{{ $institution['postal_address'] }}</p>@endif
@if($institution['telephone'] ?? false)<p>TEL: {{ $institution['telephone'] }}</p>@endif
@if($institution['email'] ?? false)<p>Email: {{ $institution['email'] }}</p>@endif
@if($institution['website'] ?? false)<p>Web: {{ $institution['website'] }}</p>@endif
<h2>FEE STATEMENT</h2>
</header>
<div class="statement-rule"></div>
<table class="statement-details">
<colgroup><col><col><col><col></colgroup>
<tbody>
<tr><th>STUDENT NAME:</th><td>{{ $student['name'] ?? '-' }}</td><th>REG NO:</th><td>{{ $student['admission_number'] ?? '-' }}</td></tr>
<tr><th>PROGRAM:</th><td>{{ $course['name'] ?? '-' }}</td><th>ADMISSION YEAR:</th><td>{{ $student['admission_year'] ?? '-' }}</td></tr>
<tr><th>DEPARTMENT:</th><td>{{ $course['department'] ?? '-' }}</td><th>YEAR OF STUDY:</th><td>{{ $student['year_of_study'] ?? '-' }}</td></tr>
<tr><th>SCHOOL/FACULTY:</th><td>{{ $course['school'] ?? $course['level'] ?? '-' }}</td><th>STUDENT TYPE:</th><td>{{ $student['type'] ?? 'Regular' }}</td></tr>
</tbody></table>
<table class="statement-ledger">
<thead><tr><th class="statement-number">No.</th><th class="statement-date">Date</th><th class="statement-reference">Ref</th><th class="statement-description">Description</th><th class="statement-money">Debit (KES)</th><th class="statement-money">Credit (KES)</th><th class="statement-money">Balance (KES)</th></tr></thead>
<tbody>
@forelse($transactions as $i => $transaction)
@php
$prev = $transactions[$i - 1] ?? null;
$changed = $i === 0 || ($transaction['academic_session_id'] !== ($prev['academic_session_id'] ?? null));
@endphp
@if($changed)
<tr class="statement-session-row"><th colspan="7">{{ $transaction['session_label'] ?? 'OTHER TRANSACTIONS' }}</th></tr>
@endif
<tr class="statement-transaction-row">
<td>{{ $transaction['number'] }}</td>
<td>{{ $transaction['date'] }}</td>
<td>{{ $transaction['reference'] ?? '-' }}</td>
<td>{{ $transaction['description'] }}</td>
<td class="statement-amount">{{ number_format(max(0, (float) $transaction['debit']), 2) }}</td>
<td class="statement-amount">{{ number_format(max(0, (float) $transaction['credit']), 2) }}</td>
<td class="statement-amount">{{ number_format((float) $transaction['balance'], 2) }}</td>
</tr>
@empty
<tr><td colspan="7" class="statement-empty">No fee transactions found.</td></tr>
@endforelse
<tr class="statement-total-row"><th colspan="4">TOTAL</th><td class="statement-amount">{{ number_format((float) $summary['total_debit'], 2) }}</td><td class="statement-amount">{{ number_format((float) $summary['total_credit'], 2) }}</td><td class="statement-amount">{{ number_format((float) $summary['ledger_balance'], 2) }}</td></tr>
</tbody>
</table>
<footer class="statement-footer">
  <div class="statement-footer-line">
    <span> Fee Statement</span>
  </div>
</footer>
<script type="text/php">
if (isset($pdf) && isset($fontMetrics)) {
    $font = $fontMetrics->getFont('Helvetica', 'normal');
    $pdf->page_text(495, 815, 'Page {PAGE_NUM} of {PAGE_COUNT}', $font, 8, [0, 0, 0]);
}
</script>
</body>
</html>