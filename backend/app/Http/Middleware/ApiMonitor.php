<?php

namespace App\Http\Middleware;

use App\Models\ApiEndpointError;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ApiMonitor
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $response = $next($request);

            if ($response->getStatusCode() >= 500) {
                $this->recordError($request, $response);
            }

            return $response;
        } catch (\Throwable $e) {
            $this->recordError($request, $e);
            throw $e;
        }
    }

    private function recordError(Request $request, \Throwable|Response|null $error): void
    {
        try {
            $now = now();

            $errorMessage = $error instanceof \Throwable
                ? $error->getMessage()
                : (($error?->exception) ? $error->exception->getMessage() : 'Unknown error');

            $context = [
                'error' => $errorMessage,
                'query' => $request->query->all(),
                'headers' => [
                    'content-type' => $request->header('Content-Type'),
                    'referer' => $request->header('Referer'),
                ],
            ];

            if ($error instanceof \Throwable) {
                $context['exception'] = $error::class;
                $context['file'] = $error->getFile();
                $context['line'] = $error->getLine();
                $context['trace'] = collect($error->getTrace())->take(5)->values();
            }

            $method = $request->method();
            $path = $request->path();

            $existing = ApiEndpointError::where('method', $method)
                ->where('path', $path)
                ->first();

            if ($existing) {
                $status = $existing->status === 'resolved' ? 'pending' : $existing->status;

                $existing->update([
                    'error_count' => $existing->error_count + 1,
                    'last_error_message' => substr($errorMessage, 0, 2000),
                    'last_context' => $context,
                    'last_ip' => $request->ip(),
                    'last_occurred_at' => $now,
                    'status' => $status,
                ]);
            } else {
                ApiEndpointError::create([
                    'method' => $method,
                    'path' => $path,
                    'error_count' => 1,
                    'last_error_message' => substr($errorMessage, 0, 2000),
                    'last_context' => $context,
                    'last_ip' => $request->ip(),
                    'first_occurred_at' => $now,
                    'last_occurred_at' => $now,
                    'status' => 'pending',
                ]);
            }
        } catch (\Throwable $logError) {
            Log::error('ApiMonitor failed to record', [
                'error' => $logError->getMessage(),
                'path' => $request->path(),
            ]);
        }
    }
}
