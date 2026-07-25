<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Http\Request;

$user = App\Models\User::where('login_id', 'EMP-ADMIN-001')->first();
echo "User: " . ($user->id ?? 'N/A') . "\n";
echo "Has finance.update: " . ($user->can('finance.update') ? 'YES' : 'NO') . "\n";

// Test the exact condition in FeeStructureController@store
$condition = $user->can('finance.update') || $user->can('manage-fee-structures');
echo "Abort condition (should be true): " . ($condition ? 'TRUE' : 'FALSE') . "\n";

// Also test via Gate::forUser
$gateResult = app('Illuminate\Contracts\Auth\Access\Gate')->forUser($user)->check('finance.update');
echo "Gate check finance.update: " . ($gateResult ? 'YES' : 'NO') . "\n";

// Check if user returns from request
$request = Request::create('/test', 'GET');
$request->setUserResolver(function () use ($user) {
    return $user;
});
$requestUser = $request->user();
echo "Request user: " . ($requestUser?->id ?? 'NULL') . "\n";
echo "Request user can finance.update: " . ($requestUser?->can('finance.update') ? 'YES' : 'NO') . "\n";
