<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupportRequest extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'support_requests';

    protected $fillable = [
        'student_id',
        'subject',
        'description',
        'status',
        'escalated_to',
        'escalated_at',
        'admin_notes',
        'resolved_at',
    ];

    protected $casts = [
        'escalated_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function escalatedTo(): BelongsTo
    {
        return $this->belongsTo(Staffs::class, 'escalated_to');
    }
}
