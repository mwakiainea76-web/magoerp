<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\staffs;
use App\Http\Requests\StorestaffsRequest;
use App\Http\Requests\UpdatestaffsRequest;

class StaffsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorestaffsRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(staffs $staffs)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(staffs $staffs)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatestaffsRequest $request, staffs $staffs)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(staffs $staffs)
    {
        //
    }
}
