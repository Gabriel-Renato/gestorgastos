<?php
// database/migrations/2026_01_01_000001_create_expenses_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('color', 10)->default('#6b7280');
            $table->string('icon', 10)->default('📦');
            $table->timestamps();
        });

        Schema::create('people', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->decimal('amount', 10, 2);
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->foreignId('person_id')->constrained('people')->restrictOnDelete();
            $table->string('location')->nullable();
            $table->enum('payment_method', ['credit_card', 'debit', 'cash', 'pix', 'transfer'])->default('pix');
            $table->string('payment_month', 7); // Format: YYYY-MM
            $table->date('due_date')->nullable();
            $table->unsignedTinyInteger('installments')->default(1);
            $table->unsignedTinyInteger('current_installment')->default(1);
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'paid', 'overdue'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('people');
        Schema::dropIfExists('categories');
    }
};
