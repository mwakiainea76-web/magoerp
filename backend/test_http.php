<?php
$url = 'http://127.0.0.1:8000/api/fee-structures';
$data = [
    'name' => 'Test Fee',
    'code' => 'TEST-' . rand(10000, 99999),
    'items' => [
        ['name' => 'Tuition', 'amount' => 50000],
    ],
    'action' => 'draft',
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Content-Type: application/json',
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status: $httpCode\n";
echo "Response: $response\n";
