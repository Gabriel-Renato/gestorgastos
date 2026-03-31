<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Person;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Alimentação', 'color' => '#f59e0b', 'icon' => '🛒'],
            ['name' => 'Moradia', 'color' => '#3b82f6', 'icon' => '🏠'],
            ['name' => 'Transporte', 'color' => '#8b5cf6', 'icon' => '🚗'],
            ['name' => 'Saúde', 'color' => '#10b981', 'icon' => '💊'],
            ['name' => 'Lazer', 'color' => '#ec4899', 'icon' => '🎭'],
            ['name' => 'Educação', 'color' => '#0ea5e9', 'icon' => '📚'],
            ['name' => 'Roupas', 'color' => '#f97316', 'icon' => '👕'],
            ['name' => 'Tecnologia', 'color' => '#6366f1', 'icon' => '💻'],
            ['name' => 'Outros', 'color' => '#6b7280', 'icon' => '📦'],
        ];

        foreach ($categories as $row) {
            Category::firstOrCreate(['name' => $row['name']], $row);
        }

        foreach (['João', 'Maria', 'Pedro', 'Ana'] as $name) {
            Person::firstOrCreate(['name' => $name]);
        }
    }
}
