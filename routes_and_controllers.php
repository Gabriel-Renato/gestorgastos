<?php
// routes/api.php — trecho a colar no seu arquivo routes/api.php do Laravel
// (as rotas da API costumam ficar sob o prefixo /api definido em bootstrap/app.php ou RouteServiceProvider)

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\PersonController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Rotas estáticas ANTES do apiResource para não serem capturadas por {expense}
    Route::get('expenses/dashboard', [ExpenseController::class, 'dashboard']);
    Route::get('expenses/alerts', [ExpenseController::class, 'alerts']);
    Route::patch('expenses/{expense}/pay', [ExpenseController::class, 'markPaid']);

    Route::apiResource('expenses', ExpenseController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('people', PersonController::class);
});
