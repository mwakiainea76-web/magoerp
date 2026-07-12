<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Calendar Events - {{ $scope_name }}</title>
@php
    $logoPath = $institution['logo_path'] ?? null;
    $logoDataUri = $logoPath && is_file($logoPath)
        ? 'data:image/' . pathinfo($logoPath, PATHINFO_EXTENSION) . ';base64,' . base64_encode(file_get_contents($logoPath))
        : null;
    $events = collect($events ?? []);
@endphp
<style>
@page { size: A4 portrait; margin: 14mm 10mm 16mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; line-height: 1.25; color: #111111; margin: 0; }
.header { text-align: center; }
.header img { display: block; margin: 0 auto 2mm; max-width: 44mm; max-height: 14mm; }
.header h1 { margin: 0; font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: .02em; }
.header p { margin: 0.3mm 0 0; font-size: 7pt; }
.title { margin-top: 2mm; font-size: 10pt; font-weight: 700; color: #000000; text-align: center; }
.rule { margin-top: 2mm; border-top: 1px solid #000000; }
.scope-info { margin: 2.5mm 0; font-size: 7.5pt; color: #374151; }
.record-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; line-height: 1.2; }
.record-table th,
.record-table td { border: 1px solid #64748b; padding: 1.2mm 1.2mm; vertical-align: top; }
.record-table thead th { font-weight: 700; text-align: left; background: #f8fafc; }
.record-table .col-number { width: 6%; text-align: center; }
.record-table .col-event { width: 38%; }
.record-table .col-type { width: 18%; }
.record-table .col-start { width: 19%; }
.record-table .col-end { width: 19%; }
.empty-row { text-align: center; padding: 6mm 0; }
.footer { position: fixed; left: 0; right: 0; bottom: -12mm; font-size: 6.5pt; text-transform: uppercase; }
.footer-line { border-top: 1px solid #000; padding-top: 1.2mm; display: flex; justify-content: space-between; align-items: center; }
</style>
</head>
<body>
<div class="header">
    @if($logoDataUri)<img src="{{ $logoDataUri }}" alt="Institution logo">@endif
    @if($institution['postal_address'] ?? false)<p>{{ $institution['postal_address'] }}</p>@endif
    @if($institution['telephone'] ?? false)<p>TEL: {{ $institution['telephone'] }}</p>@endif
    @if($institution['email'] ?? false)<p>Email: {{ $institution['email'] }}</p>@endif
    @if($institution['website'] ?? false)<p>Web: {{ $institution['website'] }}</p>@endif
</div>
<div class="title">Calendar Events Report</div>
<div class="rule"></div>

<div class="scope-info">
    <strong>Scope:</strong> {{ $scope_name }} &middot; {{ $start_date }} &ndash; {{ $end_date }}
    &nbsp;&nbsp;&nbsp; <strong>Generated:</strong> {{ $generated_at }}
</div>

<table class="record-table">
    <thead>
        <tr>
            <th class="col-number">#</th>
            <th class="col-event">Event</th>
            <th class="col-type">Type</th>
            <th class="col-start">Start Date</th>
            <th class="col-end">End Date</th>
        </tr>
    </thead>
    <tbody>
        @forelse($events as $entry)
            <tr>
                <td class="col-number">{{ $loop->iteration }}</td>
                <td>{{ $entry['title'] ?? '-' }}</td>
                <td>{{ $entry['event_type']['label'] ?? $entry['type'] ?? '-' }}</td>
                <td>{{ $entry['start_date'] ?? '-' }}</td>
                <td>{{ $entry['end_date'] ?? '-' }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="5" class="empty-row">No events found for this period.</td>
            </tr>
        @endforelse
    </tbody>
</table>

<footer class="footer">
    <div class="footer-line">
        <span>Calendar Events</span>
        <span>Page {PAGE_NUM} of {PAGE_COUNT}</span>
    </div>
</footer>
<script type="text/php">
if (isset($pdf) && isset($fontMetrics)) {
    $font = $fontMetrics->getFont('Helvetica', 'normal');
    $pdf->page_text(460, 808, 'Page {PAGE_NUM} of {PAGE_COUNT}', $font, 8, [0, 0, 0]);
}
</script>
</body>
</html>
