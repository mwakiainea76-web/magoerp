<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasUuids, SoftDeletes, HasRoles;

    protected $guard_name = 'web';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'login_id',
        'email',
        'role',
        'status',
        'first_name',
        'middle_name',
        'last_name',
        'gender',
        'date_of_birth',
        'nationality',
        'national_id',
        'place_of_birth',
        'religion',
        'phone_number',
        'alternative_phone_number',
        'address',
        'city',
        'postal_code',
        'country',
        'county',
        'profile_picture',
        'is_pwd',
        'disability_type',
        'disability_description',
        'next_of_kin_last_name',
        'next_of_kin_first_name',
        'next_of_kin_phone',
        'next_of_kin_alt_phone',
        'next_of_kin_email',
        'next_of_kin_relationship',
        'last_login_at',
        'created_by',
        'updated_by',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'date_of_birth' => 'date',
            'is_pwd' => 'boolean',
            'status' => 'boolean',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function staff(): HasOne
    {
        return $this->hasOne(staffs::class, 'user_id');
    }

    public function student(): HasOne
    {
        return $this->hasOne(Student::class, 'user_id');
    }

    public function createdStaffs(): HasMany
    {
        return $this->hasMany(staffs::class, 'created_by');
    }

    public function updatedStaffs(): HasMany
    {
        return $this->hasMany(staffs::class, 'updated_by');
    }

    public function createdDepartments(): HasMany
    {
        return $this->hasMany(departments::class, 'created_by');
    }

    public function updatedDepartments(): HasMany
    {
        return $this->hasMany(departments::class, 'updated_by');
    }

    public function primaryRole(): ?string
    {
        return $this->getRoleNames()->first() ?? $this->role;
    }
}
