<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'initials' => $this->initials,
            'name' => $this->name,
            'duration_months' => $this->duration_months,
            'duration_label' => $this->duration_label,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'certification_authority_id' => $this->certification_authority_id,
            'certification_authority_code' => $this->authority?->code,
            'certification_authority_name' => $this->authority?->name,
            'certification_level_id' => $this->certification_level_id,
            'certification_level_code' => $this->level?->code,
            'certification_level_name' => $this->level?->name,
            'department_id' => $this->department_id,
            'department_name' => $this->department?->name,
            'curricula' => $this->curricula->map(fn ($curriculum) => [
                'id' => $curriculum->id,
                'pivot_id' => $curriculum->pivot->id,
                'code' => $curriculum->code,
                'name' => $curriculum->name,
                'is_active' => $curriculum->pivot->is_active,
                'linked_at' => $curriculum->pivot->created_at,
            ])->values(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
