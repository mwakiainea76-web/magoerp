<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Http\Requests\StoreAcademicSessionRequest;
use App\Http\Requests\UpdateAcademicSessionRequest;
use App\Models\AcademicSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\PaginationMeta;

class AcademicSessionsController extends Controller
{
    use PaginationMeta;
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $yearId = (string) $request->string('academic_year_id', '');
        $sortBy = (string) $request->string('sort_by', 'created_at');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'desc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'code' => 'code',
            'name' => 'name',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $sessions = AcademicSession::query()
            ->with('year')
            ->when($yearId !== '', fn ($query) => $query->where('academic_year_id', $yearId))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('year', function ($yearQuery) use ($search) {
                            $yearQuery
                                ->where('code', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'created_at', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $sessions->getCollection()->map(fn (AcademicSession $session) => $this->transformSession($session))->values(),
            'meta' => $this->paginationMeta($sessions, [
                'q' => $search,
                'status' => $status,
                'academic_year_id' => $yearId,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreAcademicSessionRequest $request): JsonResponse
    {
        $session = AcademicSession::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $session->load('year');

        return response()->json([
            'message' => 'Academic session created successfully.',
            'data' => $this->transformSession($session),
        ], 201);
    }

    public function show(Request $request, AcademicSession $academic_session): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $academic_session->load('year');

        return response()->json([
            'data' => $this->transformSession($academic_session),
        ]);
    }

    public function update(UpdateAcademicSessionRequest $request, AcademicSession $academic_session): JsonResponse
    {
        $academic_session->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        $academic_session->load('year');

        return response()->json([
            'message' => 'Academic session updated successfully.',
            'data' => $this->transformSession($academic_session),
        ]);
    }

    public function destroy(Request $request, AcademicSession $academic_session): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        $academic_session->delete();

        return response()->json([
            'message' => 'Academic session deleted successfully.',
        ]);
    }

    private function transformSession(AcademicSession $session): array
    {
        return [
            'id' => $session->id,
            'academic_year_id' => $session->academic_year_id,
            'academic_year_code' => $session->year?->code,
            'academic_year_name' => $session->year?->name,
            'code' => $session->code,
            'name' => $session->name,
            'start_date' => $session->start_date?->toDateString(),
            'end_date' => $session->end_date?->toDateString(),
            'description' => $session->description,
            'is_active' => $session->is_active,
            'created_at' => $session->created_at,
            'updated_at' => $session->updated_at,
        ];
    }

}
