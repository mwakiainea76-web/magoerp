<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\AuthenticateApiTokenCookie;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = User::where('login_id', $credentials['login_id'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'Your account with this username is not registered.',
            ], 422);
        }

        if (! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid login credentials.',
            ], 422);
        }

        if (! $user->status) {
            return response()->json([
                'message' => 'This account is disabled.Contact administrator.',
            ], 403);
        }

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $this->transformUser($user->fresh()),
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

        $request->user()?->currentAccessToken()?->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->transformUser($user),
        ])->withCookie($this->authCookie($token));
    }

    private function authCookie(string $token): \Symfony\Component\HttpFoundation\Cookie
    {
        return cookie(
            AuthenticateApiTokenCookie::COOKIE_NAME,
            $token,
            60 * 24,
            '/',
            null,
            (bool) config('session.secure', false),
            true,
            false,
            'lax',
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
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => trim($user->first_name . ' ' . $user->last_name),
        ];
    }
}



