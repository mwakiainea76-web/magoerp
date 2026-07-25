<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$userId = '019f5171-f74f-73e3-a5c7-39be3dbe2fab';

$rows = DB::table('model_has_roles')->where('model_uuid', $userId)->get();
echo "model_has_roles entries:\n";
foreach ($rows as $r) {
    echo "  model_type: {$r->model_type}, role_id: {$r->role_id}\n";
}

$permRows = DB::table('model_has_permissions')->where('model_uuid', $userId)->get();
echo "model_has_permissions entries:\n";
foreach ($permRows as $r) {
    echo "  model_type: {$r->model_type}, permission_id: {$r->permission_id}\n";
}

$user = App\Models\User::find($userId);
echo "\nUser morph class: " . $user->getMorphClass() . "\n";
echo "Has admin role via hasRole: " . ($user->hasRole('admin') ? 'YES' : 'NO') . "\n";
