<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\PersonController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('expenses/dashboard', [ExpenseController::class, 'dashboard']);
    Route::get('expenses/alerts', [ExpenseController::class, 'alerts']);
    Route::patch('expenses/{expense}/pay', [ExpenseController::class, 'markPaid']);

    Route::apiResource('expenses', ExpenseController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('people', PersonController::class);
});
