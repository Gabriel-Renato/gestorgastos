<?php
// app/Models/Expense.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Expense extends Model
{
    protected $fillable = [
        'title', 'amount', 'category_id', 'person_id', 'location',
        'payment_method', 'payment_month', 'due_date',
        'installments', 'current_installment', 'notes', 'status',
    ];

    protected $casts = [
        'amount'              => 'decimal:2',
        'due_date'            => 'date',
        'installments'        => 'integer',
        'current_installment' => 'integer',
    ];

    protected $appends = ['days_until_due', 'is_overdue'];

    // ── Relationships ─────────────────────────────────────────────
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }

    // ── Accessors ─────────────────────────────────────────────────
    public function getDaysUntilDueAttribute(): ?int
    {
        if (!$this->due_date) return null;
        return (int) now()->startOfDay()->diffInDays($this->due_date->startOfDay(), false);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->status !== 'paid' && $this->due_date && $this->due_date->isPast();
    }

    // ── Scopes ────────────────────────────────────────────────────
    public function scopeMonth($query, string $month)
    {
        return $query->where('payment_month', $month);
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['pending', 'overdue']);
    }

    public function scopeDueSoon($query, int $days = 7)
    {
        return $query->where('status', '!=', 'paid')
                     ->whereNotNull('due_date')
                     ->whereDate('due_date', '<=', now()->addDays($days));
    }

    // ── Auto-overdue update ────────────────────────────────────────
    public static function syncOverdueStatuses(): void
    {
        self::where('status', 'pending')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->update(['status' => 'overdue']);
    }
}
