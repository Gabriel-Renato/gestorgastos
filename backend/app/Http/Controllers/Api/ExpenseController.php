<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Expense::syncOverdueStatuses();

        $query = Expense::with(['category', 'person'])
            ->orderBy('due_date', 'asc');

        if ($month = $request->get('payment_month')) {
            $query->where('payment_month', $month);
        }
        if ($cat = $request->get('category_id')) {
            $query->where('category_id', $cat);
        }
        if ($person = $request->get('person_id')) {
            $query->where('person_id', $person);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhereHas('person', fn ($p) => $p->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        $perPage = min(500, max(1, (int) $request->get('per_page', 50)));

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'               => 'required|string|max:255',
            'amount'              => 'required|numeric|min:0',
            'category_id'         => 'required|exists:categories,id',
            'person_id'           => 'required|exists:people,id',
            'location'            => 'nullable|string|max:255',
            'payment_method'      => ['required', Rule::in(['credit_card', 'debit', 'cash', 'pix', 'transfer'])],
            'payment_month'       => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'due_date'            => 'nullable|date',
            'installments'        => 'integer|min:1|max:48',
            'current_installment' => 'integer|min:1',
            'notes'               => 'nullable|string',
            'status'              => ['required', Rule::in(['pending', 'paid', 'overdue'])],
        ]);

        $expense = Expense::create($data);

        return response()->json($expense->load(['category', 'person']), 201);
    }

    public function show(Expense $expense): JsonResponse
    {
        return response()->json($expense->load(['category', 'person']));
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $data = $request->validate([
            'title'               => 'sometimes|string|max:255',
            'amount'              => 'sometimes|numeric|min:0',
            'category_id'         => 'sometimes|exists:categories,id',
            'person_id'           => 'sometimes|exists:people,id',
            'location'            => 'nullable|string|max:255',
            'payment_method'      => ['sometimes', Rule::in(['credit_card', 'debit', 'cash', 'pix', 'transfer'])],
            'payment_month'       => ['sometimes', 'regex:/^\d{4}-\d{2}$/'],
            'due_date'            => 'nullable|date',
            'installments'        => 'sometimes|integer|min:1|max:48',
            'current_installment' => 'sometimes|integer|min:1',
            'notes'               => 'nullable|string',
            'status'              => ['sometimes', Rule::in(['pending', 'paid', 'overdue'])],
        ]);

        $expense->update($data);

        return response()->json($expense->load(['category', 'person']));
    }

    public function markPaid(Expense $expense): JsonResponse
    {
        $expense->update(['status' => 'paid']);

        return response()->json($expense->load(['category', 'person']));
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();

        return response()->json(['message' => 'Gasto removido com sucesso.']);
    }

    public function dashboard(Request $request): JsonResponse
    {
        Expense::syncOverdueStatuses();

        $month = $request->get('month', now()->format('Y-m'));

        $monthExpenses = Expense::with(['category', 'person'])
            ->month($month)->get();

        $total = $monthExpenses->sum('amount');
        $paid = $monthExpenses->where('status', 'paid')->sum('amount');
        $pending = $monthExpenses->whereIn('status', ['pending', 'overdue'])->sum('amount');

        $monthlyChart = collect(range(5, 0))->map(function ($offset) {
            $m = now()->subMonths($offset)->format('Y-m');
            $exps = Expense::month($m)->get();

            return [
                'month' => $m,
                'label' => now()->subMonths($offset)->isoFormat('MMM'),
                'total' => round($exps->sum('amount'), 2),
                'paid'  => round($exps->where('status', 'paid')->sum('amount'), 2),
            ];
        });

        $byCategory = $monthExpenses->groupBy('category.name')->map(fn ($g, $name) => [
            'name'  => $name,
            'total' => round($g->sum('amount'), 2),
            'count' => $g->count(),
        ])->values()->sortByDesc('total')->values();

        $alerts = Expense::with(['category', 'person'])
            ->dueSoon(7)
            ->orderBy('due_date')
            ->get();

        return response()->json(compact('total', 'paid', 'pending', 'monthlyChart', 'byCategory', 'alerts'));
    }

    public function alerts(): JsonResponse
    {
        Expense::syncOverdueStatuses();

        return response()->json([
            'overdue' => Expense::with(['category', 'person'])->where('status', 'overdue')->orderBy('due_date')->get(),
            'today'   => Expense::with(['category', 'person'])->where('status', 'pending')->whereDate('due_date', today())->get(),
            'week'    => Expense::with(['category', 'person'])->where('status', 'pending')->whereDate('due_date', '>', today())->whereDate('due_date', '<=', now()->addDays(7))->orderBy('due_date')->get(),
            'month'   => Expense::with(['category', 'person'])->where('status', 'pending')->whereDate('due_date', '>', now()->addDays(7))->whereDate('due_date', '<=', now()->addDays(30))->orderBy('due_date')->get(),
        ]);
    }
}
