<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LectureRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LectureRoomsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $all = $request->boolean('all', false);
        $search = trim((string) $request->string('q', ''));
        $departmentId = (string) $request->string('department_id', '');
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
            ->with('department:id,name')
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhereHas('department', fn ($dq) => $dq->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($departmentId !== '', fn ($q) => $q->where('department_id', $departmentId))
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
                'department_id' => $departmentId,
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
            'department_id' => 'nullable|string|exists:departments,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:lecture_rooms,code',
            'capacity' => 'nullable|integer|min:1',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $room = LectureRoom::create($validated);
        $room->load('department:id,name');

        return response()->json([
            'message' => 'Lecture room created.',
            'data' => $this->transform($room),
        ], 201);
    }

    public function show(Request $request, LectureRoom $lectureRoom): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $lectureRoom->load('department:id,name');

        return response()->json([
            'data' => $this->transform($lectureRoom),
        ]);
    }

    public function update(Request $request, LectureRoom $lectureRoom): JsonResponse
    {
        abort_unless($request->user()?->can('institution.update'), 403);

        $validated = $request->validate([
            'department_id' => 'nullable|string|exists:departments,id',
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:lecture_rooms,code,' . $lectureRoom->id,
            'capacity' => 'nullable|integer|min:1',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $lectureRoom->update($validated);
        $lectureRoom->load('department:id,name');

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

        return response()->json(['message' => 'Lecture room deleted.']);
    }

    private function transform(LectureRoom $room): array
    {
        return [
            'id' => $room->id,
            'department_id' => $room->department_id,
            'department_name' => $room->department?->name,
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

    private function paginationMeta($paginator, array $filters): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
            'filters' => $filters,
        ];
    }
}
