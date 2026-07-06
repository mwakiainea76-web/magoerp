<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Traits\PaginationMeta;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInstitutionRequest;
use App\Http\Requests\UpdateInstitutionRequest;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstitutionsController extends Controller
{
    use PaginationMeta;

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $sortBy = (string) $request->string('sort_by', 'name');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'name' => 'name',
            'code' => 'code',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $institutions = Institution::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->orderBy($sortableColumns[$sortBy] ?? 'name', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $institutions->getCollection()
                ->map(fn (Institution $institution) => $this->transformInstitution($institution))
                ->values(),
            'meta' => $this->paginationMeta($institutions, [
                'q' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreInstitutionRequest $request): JsonResponse
    {
        $institution = Institution::create([
            ...$request->validated(),
            'is_active' => $request->boolean('is_active', true),
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Institution created successfully.',
            'data' => $this->transformInstitution($institution),
        ], 201);
    }

    public function show(Request $request, Institution $institution): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        return response()->json([
            'data' => $this->transformInstitution($institution),
        ]);
    }

    public function update(UpdateInstitutionRequest $request, Institution $institution): JsonResponse
    {
        $data = $request->validated();

        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        $data['updated_by'] = $request->user()?->id;

        $institution->update($data);

        return response()->json([
            'message' => 'Institution updated successfully.',
            'data' => $this->transformInstitution($institution->fresh()),
        ]);
    }

    public function destroy(Request $request, Institution $institution): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        $institution->delete();

        return response()->json([
            'message' => 'Institution deleted successfully.',
        ]);
    }

    public function active(Request $request): JsonResponse
    {
        $institution = Institution::where('is_active', true)->first()
            ?? Institution::first();

        return response()->json([
            'data' => $institution ? $this->transformInstitution($institution) : null,
        ]);
    }

    private function transformInstitution(Institution $institution): array
    {
        return [
            'id' => $institution->id,
            'name' => $institution->name,
            'code' => $institution->code,
            'postal_address' => $institution->postal_address,
            'telephone' => $institution->telephone,
            'email' => $institution->email,
            'website' => $institution->website,
            'motto' => $institution->motto,
            'facebook' => $institution->facebook,
            'twitter' => $institution->twitter,
            'instagram' => $institution->instagram,
            'linkedin' => $institution->linkedin,
            'youtube' => $institution->youtube,
            'is_active' => $institution->is_active,
            'created_at' => $institution->created_at,
            'updated_at' => $institution->updated_at,
        ];
    }
}
