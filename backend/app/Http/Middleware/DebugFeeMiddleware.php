<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DebugFeeMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $info = [
            'user_id' => $user?->id,
            'user_exists' => $user !== null,
            'has_finance_update' => $user ? $user->can('finance.update') : 'NO_USER',
            'has_manage_fee_structures' => $user ? $user->can('manage-fee-structures') : 'NO_USER',
            'roles' => $user ? $user->getRoleNames()->toArray() : [],
            'bearer_token' => substr((string) $request->bearerToken(), 0, 20) . '...',
        ];

        \Log::info('DebugFeeMiddleware', $info);

        return $next($request);
    }
}
