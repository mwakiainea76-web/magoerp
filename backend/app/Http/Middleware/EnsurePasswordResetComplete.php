<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordResetComplete
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->must_reset_password) {
            return $next($request);
        }

        if (in_array($request->path(), ['api/me', 'api/change-password', 'api/logout'], true)) {
            return $next($request);
        }

        return response()->json([
            'message' => 'You must change your password before continuing.',
            'must_reset_password' => true,
        ], 423);
    }
}
