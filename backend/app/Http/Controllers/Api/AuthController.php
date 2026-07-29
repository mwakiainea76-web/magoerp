<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\AuthenticateApiTokenCookie;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Mail\LoginOtpMail;
use App\Models\Otp;
use App\Models\SystemConfiguration;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
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

        $mfaRoles = SystemConfiguration::getValue('mfa_required_roles', []);
        $mfaRoles[] = 'admin';
        $mfaRoles = array_unique($mfaRoles);

        if ($user->hasAnyRole($mfaRoles)) {
            $temporaryToken = $this->generateAndSendOtp($user);
            return response()->json([
                'requires_otp' => true,
                'temporary_token' => $temporaryToken,
                'expires_at' => now()->addMinutes(10)->toIso8601String(),
            ]);
        }

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

    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $this->ensureOtpNotRateLimited($request);

        $otp = Otp::where('temporary_token', $request->input('temporary_token'))->first();

        if (! $otp) {
            return response()->json(['message' => 'Invalid verification request.'], 422);
        }

        if ($otp->used_at) {
            return response()->json(['message' => 'OTP has already been used.'], 422);
        }

        if ($otp->expires_at->isPast()) {
            return response()->json(['message' => 'OTP has expired. Please login again.'], 422);
        }

        if (! Hash::check($request->input('otp'), $otp->otp)) {
            RateLimiter::hit($this->otpThrottleKey($request), 60);
            return response()->json(['message' => 'Invalid OTP.'], 422);
        }

        $otp->update(['used_at' => now()]);

        $user = $otp->user;
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

    public function resendOtp(ResendOtpRequest $request): JsonResponse
    {
        $otp = Otp::where('temporary_token', $request->input('temporary_token'))->first();

        if (! $otp) {
            return response()->json(['message' => 'Invalid request.'], 422);
        }

        if ($otp->expires_at->isPast()) {
            return response()->json(['message' => 'OTP has expired. Please login again.'], 422);
        }

        $newToken = $this->generateAndSendOtp($otp->user);

        return response()->json([
            'message' => 'A new OTP has been sent to your email.',
            'temporary_token' => $newToken,
            'expires_at' => now()->addMinutes(10)->toIso8601String(),
        ]);
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

    private function generateAndSendOtp(User $user): string
    {
        Otp::where('user_id', $user->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->delete();

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $temporaryToken = (string) Str::uuid();

        Otp::create([
            'user_id' => $user->id,
            'otp' => Hash::make($code),
            'temporary_token' => $temporaryToken,
            'type' => 'login',
            'expires_at' => now()->addMinutes(10),
        ]);

        $name = trim($user->first_name . ' ' . $user->last_name);

        Mail::to($user->email)->send(new LoginOtpMail($code, $name));

        return $temporaryToken;
    }

    private function otpThrottleKey(Request $request): string
    {
        return 'verify-otp|' . $request->input('temporary_token');
    }

    private function ensureOtpNotRateLimited(Request $request): void
    {
        $key = $this->otpThrottleKey($request);
        [$maxAttempts, $decayMinutes] = config('security.rate_limits.otp', [5, 1]);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);
            abort(429, "Too many OTP attempts. Please try again in {$seconds} seconds.");
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
