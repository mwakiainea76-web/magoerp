<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicSessionEnrolment;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelBed;
use App\Models\HostelRoom;
use App\Models\Invoice;
use App\Models\CourseEnrolment;
use App\Models\StudentLedgerEntry;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HostelsController extends Controller
{
    public function index(): JsonResponse
    {
        $hostels = Hostel::query()
            ->with(['rooms' => fn ($q) => $q->orderBy('name')])
            ->withCount(['rooms', 'allocations as active_allocations_count' => fn ($q) => $q->where('status', 'active')])
            ->latest()
            ->get()
            ->map(fn ($h) => $this->transformHostel($h));

        return response()->json([ 'data' => $hostels]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:100|unique:hostels,code',
            'session_fee_amount' => 'required|numeric|min:0',
            'gender' => 'nullable|string|in:male,female,mixed',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $hostel = Hostel::create($validated);

        return response()->json([ 'data' => $this->transformHostel($hostel)], 201);
    }

    public function show(Hostel $hostel): JsonResponse
    {
        $hostel->load(['rooms.beds' => fn ($q) => $q->orderBy('bed_number')]);

        return response()->json([ 'data' => $this->transformHostel($hostel, true)]);
    }

    public function update(Request $request, Hostel $hostel): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:100|unique:hostels,code,' . $hostel->id,
            'session_fee_amount' => 'sometimes|numeric|min:0',
            'gender' => 'nullable|string|in:male,female,mixed',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $hostel->update($validated);

        return response()->json([ 'data' => $this->transformHostel($hostel)]);
    }

    public function destroy(Hostel $hostel): JsonResponse
    {
        if ($hostel->allocations()->exists()) {
            return response()->json([ 'message' => 'Cannot delete hostel with existing allocations.'], 409);
        }

        DB::transaction(function () use ($hostel) {
            foreach ($hostel->rooms as $room) {
                $room->beds()->forceDelete();
            }
            $hostel->rooms()->forceDelete();
            $hostel->forceDelete();
        });

        return response()->json([ 'message' => 'Hostel deleted.']);
    }

    public function roomsByHostel(Hostel $hostel): JsonResponse
    {
        $rooms = $hostel->rooms()
            ->withCount(['beds', 'beds as active_beds_count' => fn ($q) => $q->where('is_active', true)])
            ->orderBy('name')
            ->get();

        return response()->json([ 'data' => $rooms]);
    }

    public function bedsByRoom(HostelRoom $hostelRoom): JsonResponse
    {
        $beds = $hostelRoom->beds()
            ->orderBy('bed_number')
            ->get()
            ->map(function ($bed) {
                $isOccupied = HostelAllocation::where('hostel_bed_id', $bed->id)
                    ->where('status', 'active')
                    ->exists();
                return [
                    'id' => $bed->id,
                    'bed_number' => $bed->bed_number,
                    'label' => $bed->label,
                    'is_active' => $bed->is_active,
                    'is_occupied' => $isOccupied,
                ];
            });

        return response()->json([ 'data' => $beds]);
    }

    // --- Allocation Management ---

    public function allocations(Request $request): JsonResponse
    {
        $query = HostelAllocation::query()
            ->with([
                'academicSessionEnrolment.student.user:id,first_name,middle_name,last_name',
                'academicSessionEnrolment.academicSession:id,name',
                'room.hostel:id,name,code',
                'room:id,name,code',
                'hostelBed:id,label',
            ]);

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($hostelId = $request->get('hostel_id')) {
            $query->whereHas('room.hostel', fn ($q) => $q->where('id', $hostelId));
        }
        if ($sessionId = $request->get('academic_session_id')) {
            $query->whereHas('academicSessionEnrolment.academicSession', fn ($q) => $q->where('id', $sessionId));
        }

        $allocations = $query->latest('allocated_on')->paginate($request->get('per_page', 20));

        $allocations->getCollection()->transform(fn ($a) => $this->transformAllocation($a));

        return response()->json(array_merge([], ($allocations)->toArray()), 200);
    }

    public function storeAllocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_session_enrolment_id' => 'required|string|exists:academic_session_enrolments,id',
            'hostel_id' => 'required|string|exists:hostels,id',
            'hostel_room_id' => 'required|string|exists:hostel_rooms,id',
            'hostel_bed_id' => 'required|string|exists:hostel_beds,id',
            'allocated_on' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $enrolment = AcademicSessionEnrolment::findOrFail($validated['academic_session_enrolment_id']);
        $hostel = Hostel::findOrFail($validated['hostel_id']);

        // Check bed availability
        $occupied = HostelAllocation::where('hostel_bed_id', $validated['hostel_bed_id'])
            ->whereHas('academicSessionEnrolment', fn ($q) => $q->where('academic_session_id', $enrolment->academic_session_id))
            ->where('status', 'active')
            ->exists();

        if ($occupied) {
            return response()->json([ 'message' => 'This bed is already allocated for this session.'], 409);
        }

        // Check if student already has allocation
        $already = HostelAllocation::where('academic_session_enrolment_id', $enrolment->id)
            ->exists();

        if ($already) {
            return response()->json([ 'message' => 'Student already has a hostel allocation for this session.'], 409);
        }

        $user = $request->user();

        $allocation = HostelAllocation::create([
            'academic_session_enrolment_id' => $enrolment->id,
            'hostel_room_id' => $validated['hostel_room_id'],
            'hostel_bed_id' => $validated['hostel_bed_id'],
            'hostel_fee_amount' => (float) $hostel->session_fee_amount,
            'allocated_on' => $validated['allocated_on'],
            'notes' => $validated['notes'] ?? null,
            'created_by' => $user?->id,
        ]);

        $allocation->load([
            'academicSessionEnrolment.student.user:id,first_name,middle_name,last_name',
            'academicSessionEnrolment.academicSession:id,name',
            'room.hostel:id,name,code',
            'room:id,name,code',
            'hostelBed:id,label',
        ]);

        return response()->json([ 'data' => $this->transformAllocation($allocation)], 201);
    }

    public function vacateAllocation(Request $request, HostelAllocation $hostelAllocation): JsonResponse
    {
        $hostelAllocation->update([
            'status' => 'vacated',
            'updated_by' => $request->user()?->id,
        ]);

        return response()->json([ 'message' => 'Allocation vacated.']);
    }

    public function myAllocation(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json([ 'message' => 'Student profile not found.'], 404);
        }

        $allocation = HostelAllocation::query()
            ->with([
                'academicSessionEnrolment.academicSession:id,name',
                'academicSessionEnrolment.student.user:id,first_name,middle_name,last_name',
                'room.hostel:id,name,code',
                'room:id,name,code',
                'hostelBed:id,label',
            ])
            ->whereHas('academicSessionEnrolment', fn ($q) => $q->where('student_id', $student->id))
            ->where('status', 'active')
            ->latest()
            ->first();

        $activeSession = AcademicSession::where('is_active', true)->latest('start_date')->first();
        $enrolment = $activeSession
            ? AcademicSessionEnrolment::where('student_id', $student->id)
                ->where('academic_session_id', $activeSession->id)
                ->first()
            : null;

        $canBook = false;
        $availableHostels = collect();
        $accountBalance = 0;
        $minFee = 0;
        $hasSufficientBalance = false;
        $reason = null;

        if ($allocation) {
            $reason = 'already_allocated';
        } elseif (!$activeSession) {
            $reason = 'no_active_session';
        } elseif (!$enrolment) {
            $reason = 'not_enrolled_in_session';
        } else {
            $courseName = CourseEnrolment::query()
                ->where('student_id', $student->id)
                ->where('status', 'enrolled')
                ->with('courseCurriculum.course:id,name')
                ->latest()
                ->first()
                ?->courseCurriculum?->course?->name;

            $allHostels = Hostel::where('is_active', true)->get();
            $genderBlocked = $allHostels->filter(fn ($h) =>
                $h->gender !== null && $h->gender !== 'mixed' && $h->gender !== $user?->gender
            )->values();
            $genderOk = $allHostels->filter(fn ($h) =>
                $h->gender === null || $h->gender === 'mixed' || $h->gender === $user?->gender
            );

            $hostels = $genderOk->map(function ($hostel) use ($activeSession) {
                $activeBeds = HostelBed::whereHas('room', fn ($q) => $q->where('hostel_id', $hostel->id)->where('is_active', true))
                    ->where('is_active', true)->count();
                $occupiedBeds = HostelAllocation::whereHas('room', fn ($q) => $q->where('hostel_id', $hostel->id))
                    ->whereHas('academicSessionEnrolment', fn ($q) => $q->where('academic_session_id', $activeSession->id))
                    ->where('status', 'active')->distinct('hostel_bed_id')->count('hostel_bed_id');

                return [
                    'id' => $hostel->id,
                    'name' => $hostel->name,
                    'code' => $hostel->code,
                    'gender' => $hostel->gender,
                    'location' => $hostel->location,
                    'session_fee_amount' => (float) $hostel->session_fee_amount,
                    'active_beds' => $activeBeds,
                    'occupied_beds' => $occupiedBeds,
                    'available_beds' => max(0, $activeBeds - $occupiedBeds),
                ];
            })->values();

            $withBeds = $hostels->filter(fn ($h) => $h['available_beds'] > 0)->values();

            $availableHostels = $withBeds;
            $canBook = $withBeds->isNotEmpty();
            $minFee = $withBeds->min('session_fee_amount') ?? 0;

            if ($allHostels->isEmpty()) {
                $reason = 'no_active_hostels';
            } elseif ($genderBlocked->isNotEmpty() && $genderOk->isEmpty()) {
                $reason = 'gender_mismatch';
            } elseif ($hostels->isNotEmpty() && $withBeds->isEmpty()) {
                $reason = 'all_hostels_full';
            }

            $accountBalance = (float) StudentLedgerEntry::where('student_id', $student->id)
                ->selectRaw('COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) as balance')
                ->value('balance');

            $hasSufficientBalance = $accountBalance >= $minFee;
        }

        return response()->json([
            'data' => [
                'allocation' => $allocation ? $this->transformAllocation($allocation) : null,
                'can_book' => $canBook,
                'available_hostels' => $availableHostels,
                'account_balance' => $accountBalance,
                'minimum_fee' => $minFee,
                'has_sufficient_balance' => $hasSufficientBalance,
                'reason' => $reason,
            ],
        ]);
    }

    public function availableHostels(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user?->student;

        if (!$student) {
            return response()->json([ 'message' => 'Student profile not found.'], 404);
        }

        $activeSession = AcademicSession::where('is_active', true)->latest('start_date')->first();

        if (!$activeSession) {
            return response()->json([ 'data' => []]);
        }

        $enrolment = AcademicSessionEnrolment::where('student_id', $student->id)
            ->where('academic_session_id', $activeSession->id)
            ->first();

        if (!$enrolment) {
            return response()->json([ 'data' => []]);
        }

        // Check existing allocation
        $existing = HostelAllocation::whereHas('academicSessionEnrolment', fn ($q) => $q->where('student_id', $student->id)->where('academic_session_id', $activeSession->id))
            ->exists();

        if ($existing) {
            return response()->json([ 'data' => []]);
        }

        $courseName = CourseEnrolment::query()
            ->where('student_id', $student->id)
            ->where('status', 'enrolled')
            ->with('courseCurriculum.course:id,name')
            ->latest()
            ->first()
            ?->courseCurriculum?->course?->name;

        $hostels = Hostel::where('is_active', true)
            ->where(function ($q) use ($user) {
                $q->whereNull('gender')
                    ->orWhere('gender', 'mixed')
                    ->orWhere('gender', $user?->gender);
            })
            ->get()
            ->map(function ($hostel) use ($activeSession) {
                $activeBeds = HostelBed::whereHas('room', fn ($q) => $q->where('hostel_id', $hostel->id)->where('is_active', true))
                    ->where('is_active', true)
                    ->count();

                $occupiedBeds = HostelAllocation::whereHas('room', fn ($q) => $q->where('hostel_id', $hostel->id))
                    ->whereHas('academicSessionEnrolment', fn ($q) => $q->where('academic_session_id', $activeSession->id))
                    ->where('status', 'active')
                    ->distinct('hostel_bed_id')
                    ->count('hostel_bed_id');

                return [
                    'id' => $hostel->id,
                    'name' => $hostel->name,
                    'code' => $hostel->code,
                    'gender' => $hostel->gender,
                    'location' => $hostel->location,
                    'session_fee_amount' => (float) $hostel->session_fee_amount,
                    'description' => $hostel->description,
                    'active_rooms_count' => $hostel->rooms()->where('is_active', true)->count(),
                    'active_beds_count' => $activeBeds,
                    'available_beds_count' => max(0, $activeBeds - $occupiedBeds),
                ];
            })
            ->filter(fn ($h) => $h['available_beds_count'] > 0)
            ->values();

        return response()->json([ 'data' => $hostels]);
    }

    public function selfBook(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user?->student;

        if (!$student) {
            return response()->json([ 'message' => 'Student profile not found.'], 404);
        }

        $validated = $request->validate([
            'hostel_id' => ['required', 'string', 'exists:hostels,id'],
        ]);

        $hostel = Hostel::findOrFail($validated['hostel_id']);

        $activeSession = AcademicSession::where('is_active', true)->latest('start_date')->first();

        if (!$activeSession) {
            return response()->json([ 'message' => 'No active academic session.'], 422);
        }

        $enrolment = AcademicSessionEnrolment::where('student_id', $student->id)
            ->where('academic_session_id', $activeSession->id)
            ->first();

        if (!$enrolment) {
            return response()->json([ 'message' => 'You are not enrolled in the current session.'], 422);
        }

        $existingAllocation = HostelAllocation::whereHas('academicSessionEnrolment', fn ($q) => $q->where('student_id', $student->id)->where('academic_session_id', $activeSession->id))
            ->where('status', 'active')
            ->exists();

        if ($existingAllocation) {
            return response()->json([ 'message' => 'You already have a hostel allocation for this session.'], 409);
        }

        $existingHostelInvoice = Invoice::where('student_id', $student->id)
            ->where('academic_session_id', $activeSession->id)
            ->where('invoice_type', 'hostel')
            ->whereIn('status', ['issued', 'partial'])
            ->exists();

        if ($existingHostelInvoice) {
            return response()->json([ 'message' => 'You already have a pending hostel invoice for this session.'], 409);
        }

        if ($hostel->gender && $hostel->gender !== 'mixed') {
            $studentGender = $user?->gender;
            if ($studentGender && $studentGender !== $hostel->gender) {
                return response()->json([ 'message' => "This hostel is for {$hostel->gender} students only."], 422);
            }
        }

        // Find an available bed
        $availableBed = HostelBed::whereHas('room', function ($q) use ($hostel) {
            $q->where('hostel_id', $hostel->id)->where('is_active', true);
        })
            ->where('is_active', true)
            ->whereDoesntHave('allocations', function ($q) use ($activeSession) {
                $q->whereHas('academicSessionEnrolment', fn ($sq) => $sq->where('academic_session_id', $activeSession->id))
                    ->where('status', 'active');
            })
            ->first();

        if (!$availableBed) {
            return response()->json([ 'message' => 'No available beds in this hostel.'], 422);
        }

        $room = $availableBed->room;

        $result = DB::transaction(function () use ($student, $hostel, $room, $availableBed, $enrolment, $activeSession, $user) {
            $invoiceService = app(InvoiceService::class);
            $invoice = $invoiceService->createHostelInvoiceForStudent($student, $hostel, $user?->id);

            $allocation = HostelAllocation::create([
                'academic_session_enrolment_id' => $enrolment->id,
                'hostel_room_id' => $room->id,
                'hostel_bed_id' => $availableBed->id,
                'hostel_fee_amount' => (float) $hostel->session_fee_amount,
                'allocated_on' => now()->toDateString(),
                'status' => 'active',
                'notes' => 'Self-booked by student.',
                'created_by' => $user?->id,
            ]);

            return [
                'allocation' => [
                    'id' => $allocation->id,
                    'hostel_name' => $hostel->name,
                    'room_name' => $room->name,
                    'bed_label' => $availableBed->label,
                    'hostel_fee_amount' => (float) $hostel->session_fee_amount,
                    'allocated_on' => $allocation->allocated_on?->toDateString(),
                    'status' => $allocation->status,
                ],
                'invoice' => [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'amount' => (float) $invoice->amount_due,
                    'due_date' => $invoice->due_date?->toDateString(),
                ],
            ];
        });

        return response()->json([
            'message' => 'Hostel booked successfully.',
            'data' => $result,
        ]);
    }

    public function bookingEligibility(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user?->student;

        if (!$student) {
            return response()->json([ 'message' => 'Student profile not found.'], 404);
        }

        $activeSession = AcademicSession::where('is_active', true)->latest('start_date')->first();
        $eligibility = ['eligible' => false, 'message' => '', 'can_book' => false];

        if (!$activeSession) {
            $eligibility['message'] = 'No active academic session.';
            return response()->json([ 'data' => $eligibility]);
        }

        $enrolment = AcademicSessionEnrolment::where('student_id', $student->id)
            ->where('academic_session_id', $activeSession->id)
            ->first();

        if (!$enrolment) {
            $eligibility['message'] = 'You are not enrolled in the current academic session.';
            return response()->json([ 'data' => $eligibility]);
        }

        $existingAllocation = HostelAllocation::whereHas('academicSessionEnrolment', fn ($q) => $q->where('student_id', $student->id)->where('academic_session_id', $activeSession->id))
            ->where('status', 'active')
            ->first();

        if ($existingAllocation) {
            $eligibility['eligible'] = true;
            $eligibility['message'] = 'You already have a hostel allocation.';
            $eligibility['can_book'] = false;
            $eligibility['allocation'] = [
                'hostel_name' => $existingAllocation->room?->hostel?->name,
                'room_name' => $existingAllocation->room?->name,
                'bed_label' => $existingAllocation->hostelBed?->label,
                'status' => $existingAllocation->status,
            ];
            return response()->json([ 'data' => $eligibility]);
        }

        $totalBalance = StudentLedgerEntry::where('student_id', $student->id)
            ->selectRaw('COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) as balance')
            ->value('balance');

        $eligibility['eligible'] = true;
        $eligibility['can_book'] = true;
        $eligibility['message'] = 'You are eligible to book a hostel.';
        $eligibility['account_balance'] = (float) ($totalBalance ?? 0);

        return response()->json([ 'data' => $eligibility]);
    }

    // --- Helpers ---

    private function syncBeds(HostelRoom $room, int $bedCount): void
    {
        $existing = HostelBed::withTrashed()
            ->where('hostel_room_id', $room->id)
            ->get()
            ->keyBy('bed_number');

        for ($i = 1; $i <= $bedCount; $i++) {
            $bed = $existing->get($i) ?? new HostelBed(['hostel_room_id' => $room->id]);
            $bed->fill([
                'hostel_room_id' => $room->id,
                'bed_number' => $i,
                'label' => $room->code . '-BED-' . str_pad((string) $i, 2, '0', STR_PAD_LEFT),
                'is_active' => true,
            ]);
            $bed->save();

            if ($bed->trashed()) {
                $bed->restore();
            }
        }

        for ($i = $bedCount + 1; $i <= $existing->count(); $i++) {
            if (isset($existing[$i]) && !$existing[$i]->allocations()->exists()) {
                $existing[$i]->forceDelete();
            }
        }
    }

    private function transformHostel($hostel, bool $withRooms = false): array
    {
        $data = [
            'id' => $hostel->id,
            'name' => $hostel->name,
            'code' => $hostel->code,
            'session_fee_amount' => (float) $hostel->session_fee_amount,
            'gender' => $hostel->gender,
            'location' => $hostel->location,
            'description' => $hostel->description,
            'is_active' => (bool) $hostel->is_active,
            'rooms_count' => $hostel->rooms_count ?? $hostel->rooms->count(),
            'beds_count' => $hostel->rooms->sum(fn ($r) => $r->bed_count ?? $r->beds->count()),
            'active_allocations_count' => $hostel->active_allocations_count ?? 0,
        ];

        if ($withRooms) {
            $data['rooms'] = $hostel->rooms->sortBy('name')->values()->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'code' => $r->code,
                'floor' => $r->floor,
                'bed_count' => (int) $r->bed_count,
                'is_active' => (bool) $r->is_active,
                'beds' => $r->beds->sortBy('bed_number')->values()->map(fn ($b) => [
                    'id' => $b->id,
                    'bed_number' => $b->bed_number,
                    'label' => $b->label,
                    'is_active' => (bool) $b->is_active,
                ]),
            ]);
        }

        return $data;
    }

    private function transformAllocation($a): array
    {
        $student = $a->academicSessionEnrolment?->student;
        $session = $a->academicSessionEnrolment?->academicSession;
        $hostel = $a->room?->hostel;

        return [
            'id' => $a->id,
            'student_name' => $student
                ? trim(collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->implode(' '))
                : null,
            'admission_number' => $student?->admission_number,
            'session_name' => $session?->name,
            'hostel_name' => $hostel?->name,
            'room_name' => $a->room?->name,
            'bed_label' => $a->hostelBed?->label,
            'hostel_fee_amount' => (float) $a->hostel_fee_amount,
            'allocated_on' => $a->allocated_on?->toDateString(),
            'status' => $a->status,
            'notes' => $a->notes,
        ];
    }
}
