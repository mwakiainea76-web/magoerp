<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Http\Request;

// Get admin user
$user = App\Models\User::where('login_id', 'EMP-ADMIN-001')->first();

// Simulate a request to FeeStructureController@store
$request = Request::create('/api/fee-structures', 'POST', [
    'name' => 'Test Fee Structure',
    'code' => 'TEST-FEE-' . time(),
    'description' => 'Test description',
    'items' => [
        ['name' => 'Tuition', 'amount' => 50000, 'description' => 'Tuition fee'],
    ],
    'action' => 'draft',
]);

// Set user on request
$request->setUserResolver(function () use ($user) {
    return $user;
});

// Run through middleware
$kernel = $app->make('Illuminate\Contracts\Http\Kernel');
$response = $kernel->handle($request);

echo "Status: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";
