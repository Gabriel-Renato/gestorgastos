<?php
// app/Http/Controllers/Api/CategoryController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Category::withCount('expenses')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'required|string|unique:categories,name',
            'color' => 'required|string|max:10',
            'icon'  => 'nullable|string|max:10',
        ]);
        return response()->json(Category::create($data), 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'sometimes|string|unique:categories,name,'.$category->id,
            'color' => 'sometimes|string|max:10',
            'icon'  => 'nullable|string|max:10',
        ]);
        $category->update($data);
        return response()->json($category);
    }

    public function destroy(Category $category): JsonResponse
    {
        if ($category->expenses()->exists()) {
            return response()->json(['message' => 'Categoria possui gastos.'], 422);
        }
        $category->delete();
        return response()->json(['message' => 'Categoria removida.']);
    }
}
