<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelBed;
use App\Models\HostelRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HostelRoomsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $hostelId = (string) $request->string('hostel_id', '');
        $search = trim((string) $request->string('q', ''));
        $perPage = max(1, min((int) $request->integer('per_page', 50), 200));

        $rooms = HostelRoom::query()
            ->with('hostel:id,name,code')
            ->withCount(['beds', 'beds as active_beds_count' => fn ($q) => $q->where('is_active', true)])
            ->when($hostelId !== '', fn ($q) => $q->where('hostel_id', $hostelId))
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $rooms->getCollection()->map(fn (HostelRoom $r) => $this->transform($r))->values(),
            'meta' => [
                'current_page' => $rooms->currentPage(),
                'last_page' => $rooms->lastPage(),
                'per_page' => $rooms->perPage(),
                'total' => $rooms->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hostel_id' => 'required|string|exists:hostels,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:100|unique:hostel_rooms,code',
            'floor' => 'nullable|string|max:100',
            'bed_count' => 'required|integer|min:1',
        ]);

        $room = DB::transaction(function () use ($validated) {
            $room = HostelRoom::create($validated);
            $this->syncBeds($room, $validated['bed_count']);
            return $room;
        });

        $room->load('hostel:id,name,code', 'beds');

        return response()->json(['data' => $this->transform($room)], 201);
    }

    public function show(HostelRoom $hostelRoom): JsonResponse
    {
        $hostelRoom->load('hostel:id,name,code', 'beds');

        return response()->json(['data' => $this->transform($hostelRoom)]);
    }

    public function update(Request $request, HostelRoom $hostelRoom): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:100|unique:hostel_rooms,code,' . $hostelRoom->id,
            'floor' => 'nullable|string|max:100',
            'bed_count' => 'sometimes|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        DB::transaction(function () use ($hostelRoom, $validated) {
            $hostelRoom->update($validated);
            if (isset($validated['bed_count'])) {
                $this->syncBeds($hostelRoom, $validated['bed_count']);
            }
        });

        $hostelRoom->load('hostel:id,name,code', 'beds');

        return response()->json(['data' => $this->transform($hostelRoom)]);
    }

    public function destroy(HostelRoom $hostelRoom): JsonResponse
    {
        if ($hostelRoom->allocations()->where('status', 'active')->exists()) {
            return response()->json(['message' => 'Cannot delete room with active allocations.'], 409);
        }

        DB::transaction(function () use ($hostelRoom) {
            $hostelRoom->beds()->forceDelete();
            $hostelRoom->forceDelete();
        });

        return response()->json(['message' => 'Room deleted.']);
    }

    private function transform(HostelRoom $room): array
    {
        return [
            'id' => $room->id,
            'hostel_id' => $room->hostel_id,
            'hostel_name' => $room->hostel?->name,
            'hostel_code' => $room->hostel?->code,
            'name' => $room->name,
            'code' => $room->code,
            'floor' => $room->floor,
            'bed_count' => (int) $room->bed_count,
            'beds_count' => (int) ($room->beds_count ?? $room->beds?->count() ?? 0),
            'active_beds_count' => (int) ($room->active_beds_count ?? $room->beds?->where('is_active', true)->count() ?? 0),
            'is_active' => (bool) $room->is_active,
            'beds' => $room->relationLoaded('beds')
                ? $room->beds->sortBy('bed_number')->values()->map(fn ($b) => [
                    'id' => $b->id,
                    'bed_number' => $b->bed_number,
                    'label' => $b->label,
                    'is_active' => (bool) $b->is_active,
                ])
                : [],
            'created_at' => $room->created_at,
        ];
    }

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
}
