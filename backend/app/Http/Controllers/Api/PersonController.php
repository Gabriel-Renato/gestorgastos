<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Person;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Person::withCount('expenses')
            ->withSum('expenses', 'amount')
            ->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|unique:people,name',
        ]);

        return response()->json(Person::create($data), 201);
    }

    public function update(Request $request, Person $person): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|unique:people,name,'.$person->id,
        ]);
        $person->update($data);

        return response()->json($person);
    }

    public function destroy(Person $person): JsonResponse
    {
        if ($person->expenses()->exists()) {
            return response()->json(['message' => 'Pessoa possui gastos.'], 422);
        }
        $person->delete();

        return response()->json(['message' => 'Pessoa removida.']);
    }
}
