<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Calendar\StoreCalendarEventRequest;
use App\Http\Requests\Calendar\UpdateCalendarEventRequest;
use App\Models\AcademicSession;
use App\Models\AcademicYear;
use App\Models\CalendarEvent;
use App\Models\CalendarEventType;
use App\Services\CalendarService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CalendarController extends Controller
{
    public function __construct(
        protected CalendarService $calendarService
    ) {}

    /**
     * Get the full calendar (events + computed weekends) for a session.
     */
    public function index(AcademicSession $academicSession): JsonResponse
    {
        $calendar = $this->calendarService->getCalendar($academicSession);

        return response()->json($calendar);
    }

    /**
     * Get event types (lookup).
     */
    public function eventTypes(): JsonResponse
    {
        return response()->json([
            'data' => $this->calendarService->getEventTypes(),
        ]);
    }

    /**
     * Generate / regenerate system events for a session.
     */
    public function generate(AcademicSession $academicSession): JsonResponse
    {
        $events = $this->calendarService->generateCalendar(
            $academicSession,
            Auth::id()
        );

        return response()->json([
            'message' => 'Calendar generated successfully.',
            'data'    => $events,
        ]);
    }

    /**
     * Store a manually created event.
     */
    public function store(StoreCalendarEventRequest $request, AcademicSession $academicSession): JsonResponse
    {
        $event = $this->calendarService->createManualEvent(
            ['academic_session_id' => $academicSession->id, ...$request->validated()],
            Auth::id()
        );

        return response()->json([
            'message' => 'Event created.',
            'data'    => $event,
        ], 201);
    }

    /**
     * Update an event.
     */
    public function update(UpdateCalendarEventRequest $request, AcademicSession $academicSession, CalendarEvent $calendarEvent): JsonResponse
    {
        $event = $this->calendarService->updateEvent(
            $calendarEvent,
            $request->validated(),
            Auth::id()
        );

        return response()->json([
            'message' => 'Event updated.',
            'data'    => $event,
        ]);
    }

    /**
     * Delete an event.
     */
    public function destroy(AcademicSession $academicSession, CalendarEvent $calendarEvent): JsonResponse
    {
        $this->calendarService->deleteEvent($calendarEvent);

        return response()->json(['message' => 'Event deleted.']);
    }

    /**
     * Get the full calendar aggregated across all sessions in an academic year.
     */
    public function yearCalendar(AcademicYear $academicYear): JsonResponse
    {
        $calendar = $this->calendarService->getYearCalendar($academicYear);

        return response()->json($calendar);
    }

    /**
     * Sync holidays manually for a given year.
     */
    public function syncHolidays(Request $request, AcademicSession $academicSession): JsonResponse
    {
        $request->validate(['year' => 'required|integer|min:2000|max:2100']);

        $events = $this->calendarService->syncHolidays(
            $academicSession,
            Auth::id()
        );

        return response()->json([
            'message' => 'Holiday sync complete.',
            'data'    => $events,
        ]);
    }

    /**
     * Export calendar events as PDF for a session.
     */
    public function exportSessionPdf(AcademicSession $academicSession): Response
    {
        $calendar = $this->calendarService->getCalendar($academicSession);

        $events = collect($calendar['events'])
            ->filter(fn ($e) => !in_array($e['event_type']['code'] ?? '', ['weekend', 'holiday']))
            ->values()
            ->toArray();

        $institution = config('institution');

        $data = [
            'institution'  => $institution,
            'scope_name'   => $academicSession->name,
            'start_date'   => $academicSession->start_date?->format('Y-m-d'),
            'end_date'     => $academicSession->end_date?->format('Y-m-d'),
            'events'       => $events,
            'generated_at' => now()->format('d/m/Y H:i'),
        ];

        $filename = 'calendar-events-' . preg_replace('/[^A-Za-z0-9_-]+/', '-', $academicSession->code) . '.pdf';

        $pdf = Pdf::loadView('pdf.calendar-events', $data)
            ->setPaper('a4', 'portrait')
            ->setWarnings(false);

        return $pdf->download($filename, [
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    /**
     * Export calendar events as PDF for an academic year.
     */
    public function exportYearPdf(AcademicYear $academicYear): Response
    {
        $calendar = $this->calendarService->getYearCalendar($academicYear);

        $events = collect($calendar['events'])
            ->filter(fn ($e) => !in_array($e['event_type']['code'] ?? '', ['weekend', 'holiday']))
            ->values()
            ->toArray();

        $institution = config('institution');

        $data = [
            'institution'  => $institution,
            'scope_name'   => $academicYear->name,
            'start_date'   => $academicYear->start_date?->format('Y-m-d'),
            'end_date'     => $academicYear->end_date?->format('Y-m-d'),
            'events'       => $events,
            'generated_at' => now()->format('d/m/Y H:i'),
        ];

        $filename = 'calendar-events-' . preg_replace('/[^A-Za-z0-9_-]+/', '-', $academicYear->code) . '.pdf';

        $pdf = Pdf::loadView('pdf.calendar-events', $data)
            ->setPaper('a4', 'portrait')
            ->setWarnings(false);

        return $pdf->download($filename, [
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }
}