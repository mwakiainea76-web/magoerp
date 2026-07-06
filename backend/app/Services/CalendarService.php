<?php

namespace App\Services;

use App\Models\AcademicSession;
use App\Models\AcademicYear;
use App\Models\CalendarEvent;
use App\Models\CalendarEventType;
use App\Models\HolidaySyncLog;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Service for generating and managing the academic session calendar.
 *
 * Business rules:
 * - Weekends are computed at query time from the session date range, never stored.
 * - Kenyan public holidays are seeded from Nager.Date API, fully editable afterward.
 * - 3 CAT windows are auto-generated within the first 8 weeks of the session.
 * - End-term and national exam placeholders are provisional and editable.
 * - All system-generated events remain editable (nothing is hard-locked).
 */
class CalendarService
{
    /**
     * Seed the default event types if they don't exist.
     */
    public function seedEventTypes(): void
    {
        $types = [
            ['code' => 'holiday',        'label' => 'Public Holiday',        'color_hex' => '#ef4444'],
            ['code' => 'weekend',        'label' => 'Weekend',               'color_hex' => '#94a3b8'],
            ['code' => 'custom',         'label' => 'Custom Event',          'color_hex' => '#3b82f6'],
            ['code' => 'exams',          'label' => 'Exams',                'color_hex' => '#8b5cf6'],
            ['code' => 'graduation',     'label' => 'Graduation',           'color_hex' => '#f59e0b'],
            ['code' => 'fee_collection', 'label' => 'Fee Collection',       'color_hex' => '#10b981'],
            ['code' => 'session_break',  'label' => 'Session Break',        'color_hex' => '#6366f1'],
            ['code' => 'others',         'label' => 'Others',               'color_hex' => '#3b82f6'],
        ];

        foreach ($types as $type) {
            CalendarEventType::firstOrCreate(
                ['code' => $type['code']],
                $type
            );
        }
    }

    /**
     * Get all event types.
     */
    public function getEventTypes(): Collection
    {
        return CalendarEventType::all()->map(fn ($t) => [
            'id'    => $t->id,
            'code'  => $t->code,
            'label' => $t->label,
            'color' => $t->color_hex,
        ]);
    }

    /**
     * Generate the full calendar for a session.
     *
     * Merges persisted events with computed weekends (non-stored).
     */
    public function getCalendar(AcademicSession $session): array
    {
        $weekends = $session->start_date && $session->end_date
            ? $this->computeWeekends($session->start_date, $session->end_date)
            : [];

        $events = CalendarEvent::query()
            ->where('academic_session_id', $session->id)
            ->with('eventType')
            ->orderBy('start_date')
            ->get()
            ->map(fn (CalendarEvent $e) => $this->transformEvent($e));

        return [
            'session' => [
                'id'         => $session->id,
                'name'       => $session->name,
                'start_date' => $session->start_date?->format('Y-m-d'),
                'end_date'   => $session->end_date?->format('Y-m-d'),
            ],
            'weekends' => $weekends,
            'events'   => $events,
        ];
    }

    /**
     * Generate (regenerate) system events for a session.
     *
     * Fetches holidays from the Nager.Date API. Existing system events are
     * replaced; manual events are preserved.
     */
    public function generateCalendar(AcademicSession $session, ?string $userId = null): array
    {
        if (!$session->start_date || !$session->end_date) {
            throw ValidationException::withMessages([
                'session' => 'The academic session must have start and end dates before the calendar can be generated.',
            ]);
        }

        $this->seedEventTypes();

        // Remove old system-generated events (keep manual ones)
        CalendarEvent::where('academic_session_id', $session->id)
            ->whereIn('source', ['system_api', 'system_computed'])
            ->delete();

        $events = collect();

        // 1. Fetch and insert Kenyan public holidays
        $holidays = $this->syncHolidays($session, $userId);
        $events = $events->concat($holidays);

        return $events->toArray();
    }

    /**
     * Sync Kenyan public holidays from Nager.Date API for the session.
     */
    public function syncHolidays(AcademicSession $session, ?string $userId = null): Collection
    {
        if (!$session->start_date || !$session->end_date) {
            throw ValidationException::withMessages([
                'session' => 'The academic session must have start and end dates before holidays can be synced.',
            ]);
        }

        $years = range($session->start_date->year, $session->end_date->year);
        $created = collect();

        foreach ($years as $year) {
            $log = HolidaySyncLog::firstOrCreate(
                ['year' => $year, 'country_code' => 'KE'],
                ['status' => 'pending'],
            );

            try {
                $response = Http::timeout(10)
                    ->get("https://date.nager.at/api/v3/publicholidays/{$year}/KE");

                if ($response->successful()) {
                    $holidays = $response->json();
                    $log->update([
                        'synced_at'     => now(),
                        'raw_response'  => $holidays,
                        'status'        => 'success',
                    ]);

                    $typeId = CalendarEventType::where('code', 'holiday')->value('id');

                    foreach ($holidays as $h) {
                        $date = $h['date'] ?? null;
                        if (!$date || $date < $session->start_date->format('Y-m-d') || $date > $session->end_date->format('Y-m-d')) {
                            continue;
                        }

                        $event = CalendarEvent::create([
                            'academic_session_id' => $session->id,
                            'event_type_id'       => $typeId,
                            'title'               => $h['localName'] ?? $h['name'] ?? 'Public Holiday',
                            'description'         => $h['name'] ?? null,
                            'start_date'          => $date,
                            'end_date'            => $date,
                            'source'              => 'system_api',
                            'created_by'          => $userId,
                        ]);

                        $created->push($this->transformEvent($event));
                    }
                } else {
                    $log->update([
                        'synced_at' => now(),
                        'status'    => 'failed',
                    ]);
                }
            } catch (\Throwable $e) {
                $log->update([
                    'synced_at' => now(),
                    'status'    => 'failed',
                ]);
                Log::warning("Holiday sync failed for year {$year}: {$e->getMessage()}");
            }
        }

        return $created;
    }

    /**
     * Compute 3 CAT windows within the first 8 weeks of the session.
     *
     * CAT 1: Weeks 1–3
     * CAT 2: Weeks 4–5
     * CAT 3: Weeks 6–8
     */


    /**
     * Create a manual calendar event.
     */
    public function createManualEvent(array $data, string $userId): CalendarEvent
    {
        $event = CalendarEvent::create([
            ...$data,
            'source'     => 'manual',
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);

        $event->load('eventType');

        return $event;
    }

    /**
     * Update any calendar event (system or manual).
     */
    public function updateEvent(CalendarEvent $event, array $data, string $userId): CalendarEvent
    {
        $event->update([
            ...$data,
            'updated_by' => $userId,
        ]);

        $event->load('eventType');

        return $event;
    }

    /**
     * Delete an event. Weekends are never stored so can't be deleted.
     */
    public function deleteEvent(CalendarEvent $event): void
    {
        $event->delete();
    }

    /**
     * Get the calendar for an entire academic year (aggregates all sessions).
     */
    public function getYearCalendar(AcademicYear $year): array
    {
        $sessions = $year->sessions()->get();

        $allEvents = collect();
        $sessionInfos = [];

        foreach ($sessions as $session) {
            $events = CalendarEvent::query()
                ->where('academic_session_id', $session->id)
                ->with('eventType')
                ->get()
                ->map(fn (CalendarEvent $e) => $this->transformEvent($e));

            $allEvents = $allEvents->concat($events);

            $sessionInfos[] = [
                'id'         => $session->id,
                'name'       => $session->name,
                'code'       => $session->code,
                'start_date' => $session->start_date?->format('Y-m-d'),
                'end_date'   => $session->end_date?->format('Y-m-d'),
            ];
        }

        $weekends = $year->start_date && $year->end_date
            ? $this->computeWeekends($year->start_date, $year->end_date)
            : [];

        return [
            'year' => [
                'id'         => $year->id,
                'name'       => $year->name,
                'code'       => $year->code,
                'start_date' => $year->start_date?->format('Y-m-d'),
                'end_date'   => $year->end_date?->format('Y-m-d'),
            ],
            'sessions' => $sessionInfos,
            'weekends' => $weekends,
            'events'   => $allEvents->sortBy('start_date')->values()->toArray(),
        ];
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Compute weekend dates within the session range.
     * Weekends are never stored — computed fresh each time.
     */
    private function computeWeekends($startDate, $endDate): array
    {
        $weekends = [];
        $period = CarbonPeriod::create($startDate, $endDate);

        foreach ($period as $date) {
            if ($date->isSaturday() || $date->isSunday()) {
                $weekends[] = [
                    'date'   => $date->format('Y-m-d'),
                    'day'    => $date->format('l'),
                    'type'   => 'weekend',
                ];
            }
        }

        return $weekends;
    }

    private function transformEvent(CalendarEvent $event): array
    {
        return [
            'id'          => $event->id,
            'title'       => $event->title,
            'description' => $event->description,
            'start_date'  => $event->start_date->format('Y-m-d'),
            'end_date'    => $event->end_date->format('Y-m-d'),
            'source'      => $event->source,
            'is_locked'   => $event->is_locked,
            'event_type'  => $event->eventType ? [
                'id'    => $event->eventType->id,
                'code'  => $event->eventType->code,
                'label' => $event->eventType->label,
                'color' => $event->eventType->color_hex,
            ] : null,
            'created_at'  => $event->created_at,
            'updated_at'  => $event->updated_at,
        ];
    }
}