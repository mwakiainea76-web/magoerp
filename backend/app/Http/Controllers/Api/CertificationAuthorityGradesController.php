<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCertificationAuthorityGradeRequest;
use App\Http\Requests\UpdateCertificationAuthorityGradeRequest;
use App\Models\CertificationAuthority;
use App\Models\CertificationAuthorityGrade;
use App\Http\Controllers\Api\Traits\PaginationMeta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CertificationAuthorityGradesController extends Controller
{
    use PaginationMeta;

    public function index(Request $request, CertificationAuthority $certification_authority): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        $search = trim((string) $request->string('q', ''));
        $status = (string) $request->string('status', 'all');
        $sortBy = (string) $request->string('sort_by', 'grade_start');
        $sortDirection = strtolower((string) $request->string('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';
        $perPage = max(1, min((int) $request->integer('per_page', 10), 100));

        $sortableColumns = [
            'grade' => 'grade',
            'grade_start' => 'grade_start',
            'grade_end' => 'grade_end',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
        ];

        $grades = CertificationAuthorityGrade::query()
            ->where('certification_authority_id', $certification_authority->id)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('grade', 'like', "%{$search}%")
                        ->orWhere('remark', 'like', "%{$search}%");
                });
            })
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->orderBy($sortableColumns[$sortBy] ?? 'grade_start', $sortDirection)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $grades->getCollection()->map(fn (CertificationAuthorityGrade $grade) => $this->transformGrade($grade))->values(),
            'meta' => $this->paginationMeta($grades, [
                'q' => $search,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ]),
        ]);
    }

    public function store(StoreCertificationAuthorityGradeRequest $request, CertificationAuthority $certification_authority): JsonResponse
    {
        $grade = CertificationAuthorityGrade::create([
            ...$request->validated(),
            'certification_authority_id' => $certification_authority->id,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Grade created successfully.',
            'data' => $this->transformGrade($grade),
        ], 201);
    }

    public function show(Request $request, CertificationAuthority $certification_authority, CertificationAuthorityGrade $grade): JsonResponse
    {
        abort_unless($request->user()?->can('institution.view'), 403);

        return response()->json([
            'data' => $this->transformGrade($grade),
        ]);
    }

    public function update(UpdateCertificationAuthorityGradeRequest $request, CertificationAuthority $certification_authority, CertificationAuthorityGrade $grade): JsonResponse
    {
        $grade->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Grade updated successfully.',
            'data' => $this->transformGrade($grade),
        ]);
    }

    public function destroy(Request $request, CertificationAuthority $certification_authority, CertificationAuthorityGrade $grade): JsonResponse
    {
        abort_unless($request->user()?->can('institution.delete'), 403);

        $grade->delete();

        return response()->json([
            'message' => 'Grade deleted successfully.',
        ]);
    }

    private function transformGrade(CertificationAuthorityGrade $grade): array
    {
        return [
            'id' => $grade->id,
            'certification_authority_id' => $grade->certification_authority_id,
            'grade' => $grade->grade,
            'grade_start' => (float) $grade->grade_start,
            'grade_end' => (float) $grade->grade_end,
            'remark' => $grade->remark,
            'is_active' => $grade->is_active,
            'created_at' => $grade->created_at,
            'updated_at' => $grade->updated_at,
        ];
    }
}
