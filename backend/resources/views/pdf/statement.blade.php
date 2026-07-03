<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fee Statement - {{ $student['admission_number'] }}</title>
<style>
@page{size:A4 portrait;margin:10mm 14mm 11mm}
body{font-family:Arial,Helvetica,sans-serif;font-size:8pt;line-height:1.18;color:#000;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.statement-generated-at{margin:0 0 3mm;font-size:7.5pt}
.statement-header{text-align:center}
.statement-header h1{margin:0;font-size:14pt;font-weight:700;text-transform:uppercase}
.statement-header p{margin:.5mm 0 0;font-size:8pt}
.statement-header h2{margin:3mm 0 0;font-size:10pt;font-weight:700}
.statement-rule{margin-top:2.7mm;border-top:1px solid #000}
.statement-details{width:100%;margin-top:1.5mm;border-collapse:collapse;table-layout:fixed}
.statement-details th{width:17%;padding:1.4mm 1mm;text-align:left;vertical-align:top;font-size:8pt;font-weight:700}
.statement-details td{width:33%;padding:1.4mm 1mm;vertical-align:top;font-size:8pt}
.statement-ledger{width:100%;margin-top:2mm;border-collapse:collapse;table-layout:fixed}
.statement-ledger th,.statement-ledger td{border:1px solid #000;padding:1.45mm 1mm;vertical-align:top}
.statement-ledger thead th{text-align:left;font-size:8pt;font-weight:700;vertical-align:middle}
.statement-number{width:6%}
.statement-date{width:11%}
.statement-reference{width:11%}
.statement-money{width:15%;text-align:center}
.statement-session-row th{padding:1.5mm 1mm;text-align:left;font-size:8pt;font-weight:700;text-transform:uppercase}
.statement-transaction-row td{font-size:7.5pt}
.statement-amount{text-align:right;white-space:nowrap}
.statement-empty{padding:8mm!important;text-align:center}
.statement-total-row th{font-size:8pt;text-align:right}
.statement-footer{display:flex;justify-content:space-between;margin-top:3mm;border-top:1px solid #000;padding-top:1.5mm;font-size:7.5pt;font-weight:600;text-transform:uppercase}
</style>
</head>
<body>
<p class="statement-generated-at">{{ $generated_at ?? now()->format('d/m/Y H:i') }}</p>
<header class="statement-header">
<h1>{{ $institution['name'] ?? config('app.name') }}</h1>
@if($institution['postal_address'] ?? false)<p>{{ $institution['postal_address'] }}</p>@endif
@if($institution['telephone'] ?? false)<p>TEL: {{ $institution['telephone'] }}</p>@endif
@if($institution['email'] ?? false)<p>Email: {{ $institution['email'] }}</p>@endif
@if($institution['website'] ?? false)<p>Web: {{ $institution['website'] }}</p>@endif
<h2>FEE STATEMENT</h2>
</header>
<div class="statement-rule"></div>
<table class="statement-details"><tbody>
<tr><th>STUDENT NAME:</th><td>{{ $student['name'] ?? '-' }}</td><th>REG NO:</th><td>{{ $student['admission_number'] ?? '-' }}</td></tr>
<tr><th>PROGRAM:</th><td>{{ $course['name'] ?? '-' }}</td><th>ADMISSION YEAR:</th><td>{{ $student['admission_year'] ?? '-' }}</td></tr>
<tr><th>DEPARTMENT:</th><td>{{ $course['department'] ?? '-' }}</td><th>YEAR OF STUDY:</th><td>{{ $student['year_of_study'] ?? '-' }}</td></tr>
<tr><th>SCHOOL/FACULTY:</th><td>{{ $course['school'] ?? $course['level'] ?? '-' }}</td><th>TERM:</th><td>{{ $student['term'] ?? '-' }}</td></tr>
<tr><th>STUDENT TYPE:</th><td>{{ $student['type'] ?? 'Regular' }}</td><th></th><td></td></tr>
</tbody></table>
<p><strong>SCOPE:</strong> {{ str($statement_mode['scope'] ?? 'session_to_date')->replace('_', ' ')->headline() }}</p>
@if(count($session_breakdown ?? []))
<table class="statement-ledger">
<thead><tr><th>Session</th><th>Status</th><th class="statement-money">Fees (KES)</th><th class="statement-money">Paid (KES)</th><th class="statement-money">Balance (KES)</th></tr></thead>
<tbody>
@foreach($session_breakdown as $session)
<tr><td>{{ $session['session_name'] }}</td><td>{{ strtoupper($session['status']) }}</td><td class="statement-amount">{{ number_format((float) $session['fees'], 2) }}</td><td class="statement-amount">{{ number_format((float) $session['paid'], 2) }}</td><td class="statement-amount">{{ number_format((float) $session['outstanding'], 2) }}</td></tr>
@endforeach
<tr class="statement-total-row"><th colspan="2">TOTAL IN SCOPE</th><th>{{ number_format((float) $summary['total_invoiced'], 2) }}</th><th>{{ number_format((float) $summary['total_paid'], 2) }}</th><th>{{ number_format((float) $summary['outstanding_balance'], 2) }}</th></tr>
</tbody></table>
@endif
@if(count($dormant_fees ?? []))
<p><strong>DORMANT FUTURE FEES:</strong> KES {{ number_format((float) $summary['dormant_total'], 2) }} (included only for this requested scope)</p>
@endif
<table class="statement-ledger">
<thead><tr><th class="statement-number">No.</th><th class="statement-date">Date</th><th class="statement-reference">Ref</th><th>Description</th><th class="statement-money">Debit (KES)</th><th class="statement-money">Credit (KES)</th><th class="statement-money">Balance (KES)</th></tr></thead>
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
<tr class="statement-total-row"><th colspan="4">TOTAL</th><th>{{ number_format((float) $summary['total_debit'], 2) }}</th><th>{{ number_format((float) $summary['total_credit'], 2) }}</th><th>{{ number_format((float) $summary['ledger_balance'], 2) }}</th></tr>
</tbody>
</table>
<footer class="statement-footer"><span>{{ $institution['name'] ?? config('app.name') }}</span><span>Fee Statement</span></footer>
</body>
</html>
