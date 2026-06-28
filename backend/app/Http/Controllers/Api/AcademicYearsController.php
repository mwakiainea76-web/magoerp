<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAcademicYearRequest;
use App\Http\Requests\UpdateAcademicYearRequest;
use App\Models\AcademicYear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcademicYearsController extends Controller
{
    use PaginationMeta;

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'code' => 'code',
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
            'start_date' => 'start_date',
            'end_date' => 'end_date',
        ];

        $years = AcademicYear::query()
            ->withCount('sessions')
            ->when($search !== '', function ($query) use ($search) {
                $query->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            })
            ->orderBy($sortableColumns[$sortBy] ?? 'created_at', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $years->getCollection()
                ->map(fn (AcademicYear $year) => $this->transformYear($year))
                ->values(),
            'meta' => $this->paginationMeta($years, [
                'q' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreAcademicYearRequest $request): JsonResponse
    {
        $staffId = $request->user()?->staff?->id;

        $year = AcademicYear::create([
            ...$request->validated(),
            'created_by' => $staffId,
            'updated_by' => $staffId,
        ]);

        $year->loadCount('sessions');

        return response()->json([
            'message' => 'Academic year created successfully.',
            'data' => $this->transformYear($year),
        ], 201);
    }

    public function show(Request $request, AcademicYear $academic_year): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $academic_year->loadCount('sessions');

        return response()->json([
            'data' => $this->transformYear($academic_year),
        ]);
    }

    public function update(UpdateAcademicYearRequest $request, AcademicYear $academic_year): JsonResponse
    {
        $academic_year->update([
            ...$request->validated(),
            'updated_by' => $request->user()?->staff?->id,
        ]);

        $academic_year->loadCount('sessions');

        return response()->json([
            'message' => 'Academic year updated successfully.',
            'data' => $this->transformYear($academic_year),
        ]);
    }

    public function destroy(Request $request, AcademicYear $academic_year): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        if ($academic_year->sessions()->exists()) {
            return response()->json([
                'message' => 'Cannot delete academic year with linked academic sessions.',
            ], 409);
        }

        $academic_year->delete();

        return response()->json([
            'message' => 'Academic year deleted successfully.',
        ]);
    }

    private function transformYear(AcademicYear $year): array
    {
        return [
            'id' => $year->id,
            'code' => $year->code,
            'name' => $year->name,
            'start_date' => $year->start_date?->toDateString(),
            'end_date' => $year->end_date?->toDateString(),
            'description' => $year->description,
            'is_active' => (bool) $year->is_active,
            'sessions_count' => (int) ($year->sessions_count ?? 0),
            'created_at' => $year->created_at,
            'updated_at' => $year->updated_at,
        ];
    }
}
