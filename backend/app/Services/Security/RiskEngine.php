<?php

namespace App\Services\Security;

use App\Enums\Security\RiskLevel;
use App\Models\SecurityDevice;
use App\Security\DTO\RiskAssessmentDTO;
use App\Security\DTO\SecurityEventDTO;
use Illuminate\Support\Facades\Cache;

class RiskEngine
{
    private const DECAY_DURATION_HOURS = 24;
    private const DECAY_PER_MINUTE = 2;

    public function __construct(
        private readonly SecurityEventService $eventService,
    ) {}

    /**
     * Records a new risk event and updates the score.
     * Called when a security event adds risk points.
     */
    public function assess(SecurityEventDTO $event): RiskAssessmentDTO
    {
        $data = $this->getScoreData($event->userId, $event->deviceId);
        $currentScore = $data['score'];

        $newScore = $currentScore + $event->riskPoints;
        $newScore = max(0, min(150, $newScore));

        $this->storeScore($event->userId, $event->deviceId, $newScore, $data['last_decay_at']);

        if ($event->deviceId) {
            SecurityDevice::where('id', $event->deviceId)->update(['risk_score' => $newScore]);
        }

        return new RiskAssessmentDTO(
            score: $newScore,
            level: RiskLevel::fromScore($newScore),
            triggeredRules: [$event->eventType->value],
        );
    }

    /**
     * Reads the current score, applies time-based decay since last read,
     * writes back the decayed score, and returns it.
     *
     * Decay is proportional to elapsed minutes (configurable via DECAY_PER_MINUTE)
     * so rapid requests don't accelerate score decay.
     */
    public function getDecayedScore(?string $userId, ?string $deviceId): int
    {
        $cacheKey = $this->scoreCacheKey($userId, $deviceId);
        $data = $this->getScoreData($userId, $deviceId);

        if ($data['score'] <= 0) {
            return 0;
        }

        $elapsedMinutes = $data['last_decay_at']->diffInMinutes(now());
        if ($elapsedMinutes < 1) {
            return $data['score'];
        }

        $decayAmount = (int) ($elapsedMinutes * self::DECAY_PER_MINUTE);
        $decayed = max(0, $data['score'] - $decayAmount);

        $this->storeScore($userId, $deviceId, $decayed, now());

        return $decayed;
    }

    public function getCurrentScore(?string $userId, ?string $deviceId): int
    {
        $data = $this->getScoreData($userId, $deviceId);

        return $data['score'];
    }

    public function resetScore(?string $userId, ?string $deviceId): void
    {
        $cacheKey = $this->scoreCacheKey($userId, $deviceId);
        Cache::forget($cacheKey);

        if ($deviceId) {
            SecurityDevice::where('id', $deviceId)->update(['risk_score' => 0]);
        }
    }

    /**
     * Returns array with 'score' (int) and 'last_decay_at' (Carbon).
     * If cache is missing or corrupt, returns zeros with a fresh timestamp.
     */
    private function getScoreData(?string $userId, ?string $deviceId): array
    {
        $cacheKey = $this->scoreCacheKey($userId, $deviceId);
        $default = ['score' => 0, 'last_decay_at' => now()];
        $cached = Cache::get($cacheKey);

        if (!is_array($cached) || !isset($cached['score'])) {
            return $default;
        }

        return [
            'score' => (int) $cached['score'],
            'last_decay_at' => isset($cached['ts'])
                ? now()->setTimestamp($cached['ts'])
                : now(),
        ];
    }

    private function storeScore(?string $userId, ?string $deviceId, int $score, $lastDecayAt): void
    {
        $cacheKey = $this->scoreCacheKey($userId, $deviceId);
        $ts = $lastDecayAt instanceof \Carbon\Carbon ? $lastDecayAt->timestamp : time();
        Cache::put($cacheKey, [
            'score' => $score,
            'ts' => $ts,
        ], now()->addHours(self::DECAY_DURATION_HOURS));
    }

    private function scoreCacheKey(?string $userId, ?string $deviceId): string
    {
        $parts = array_filter(['risk_score', $userId, $deviceId]);

        if (empty($parts)) {
            $parts[] = 'risk_score';
        }

        return implode(':', $parts);
    }
}
