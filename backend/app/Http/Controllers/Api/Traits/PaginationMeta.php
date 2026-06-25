<?php

namespace App\Http\Controllers\Api\Traits;

trait PaginationMeta
{
    public function paginationMeta($paginator, array $filters): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
            'filters' => array_filter($filters, fn ($v) => $v !== '' && $v !== null),
        ];
    }
}
