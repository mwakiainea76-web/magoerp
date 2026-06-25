<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LectureRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class LectureRoomsController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $all = $request->boolean('all', false);
        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $sortBy = (string) $request->string('sort_by', 'name');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'name' => 'name',
            'code' => 'code',
            'capacity' => 'capacity',
            'location' => 'location',
            'created_at' => 'created_at',
        ];

        $query = LectureRoom::query()
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            })
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection);

        if ($all) {
            $rooms = $query->get();
            return response()->json([
                'data' => $rooms->map(fn (LectureRoom $room) => $this->transform($room))->values(),
            ]);
        }

        $rooms = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $rooms->getCollection()->map(fn (LectureRoom $room) => $this->transform($room))->values(),
            'meta' => $this->paginationMeta($rooms, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:lecture_rooms,name',
            'code' => 'required|string|max:50|unique:lecture_rooms,code',
            'capacity' => 'nullable|integer|min:1',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $room = LectureRoom::create($validated);

        return response()->json([
            'message' => 'Lecture room created.',
            'data' => $this->transform($room),
        ], 201);
    }

    public function show(Request $request, LectureRoom $lectureRoom): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        return response()->json([
            'data' => $this->transform($lectureRoom),
        ]);
    }

    public function update(Request $request, LectureRoom $lectureRoom): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:lecture_rooms,name,' . $lectureRoom->id,
            'code' => 'sometimes|string|max:50|unique:lecture_rooms,code,' . $lectureRoom->id,
            'capacity' => 'nullable|integer|min:1',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $lectureRoom->update($validated);

        return response()->json([
            'message' => 'Lecture room updated.',
            'data' => $this->transform($lectureRoom),
        ]);
    }

    public function destroy(Request $request, LectureRoom $lectureRoom): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        if ($lectureRoom->timetables()->exists()) {
            return response()->json([
                'message' => 'Cannot delete room with active timetables.',
            ], 409);
        }

        $lectureRoom->delete();

        return response()->json([ 'message' => 'Lecture room deleted.']);
    }

    private function transform(LectureRoom $room): array
    {
        return [
            'id' => $room->id,
            'name' => $room->name,
            'code' => $room->code,
            'capacity' => $room->capacity,
            'location' => $room->location,
            'description' => $room->description,
            'is_active' => (bool) $room->is_active,
            'created_at' => $room->created_at,
            'updated_at' => $room->updated_at,
        ];
    }


}
