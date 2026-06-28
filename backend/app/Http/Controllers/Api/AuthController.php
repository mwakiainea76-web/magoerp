<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\AuthenticateApiTokenCookie;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $this->ensureNotRateLimited($request);

        $credentials = $request->validated();
        $user = User::where('login_id', $credentials['login_id'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            RateLimiter::hit($this->throttleKey($request), 60);

            return response()->json([
                'message' => 'Invalid login credentials.',
            ], 422);
        }

        if (! $user->status) {
            return response()->json([
                'message' => 'This account is disabled. Contact your administrator.',
            ], 403);
        }

        RateLimiter::clear($this->throttleKey($request));

        $user->last_login_at = now();
        $user->save();

        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $this->transformUser($user),
        ])->withCookie($this->authCookie($token));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ])->withCookie(cookie()->forget(AuthenticateApiTokenCookie::COOKIE_NAME, '/'));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json([
            'user' => $this->transformUser($user),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed', 'different:current_password'],
        ]);

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
                'errors' => [
                    'current_password' => ['Current password is incorrect.'],
                ],
            ], 422);
        }

        $user->forceFill([
            'password' => $validated['password'],
            'must_reset_password' => false,
            'updated_by' => $user->id,
        ])->save();

        return response()->json([
            'message' => 'Password updated successfully.',
            'user' => $this->transformUser($user->fresh()),
        ]);
    }

    private function throttleKey(Request $request): string
    {
        return Str::lower((string) $request->input('login_id')) . '|' . $request->ip();
    }

    private function ensureNotRateLimited(Request $request): void
    {
        $key = $this->throttleKey($request);

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            abort(429, "Too many login attempts. Please try again in {$seconds} seconds.");
        }
    }

    private function authCookie(string $token): Cookie
    {
        $minutes = config('sanctum.expiration', 60 * 24);

        return cookie(
            name: AuthenticateApiTokenCookie::COOKIE_NAME,
            value: $token,
            minutes: $minutes,
            path: '/',
            domain: null,
            secure: app()->isProduction(),
            httpOnly: true,
            raw: false,
            sameSite: 'lax',
        );
    }

    private function transformUser(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $user->loadMissing('roles', 'permissions');

        return [
            'id' => $user->id,
            'login_id' => $user->login_id,
            'email' => $user->email,
            'role' => $user->primaryRole(),
            'roles' => $user->getRoleNames()->values()->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            'status' => $user->status,
            'must_reset_password' => (bool) $user->must_reset_password,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => trim($user->first_name . ' ' . $user->last_name),
        ];
    }
}
