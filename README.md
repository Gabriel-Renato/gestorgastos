# 💰 FinanceApp — Gestor de Gastos

Sistema completo de gerenciamento de gastos com frontend React e backend Laravel.

---

## 📁 Estrutura dos Arquivos

```
GestorGastos.jsx              ← Frontend React (completo, pronto para usar)
laravel/
  migration.php               → database/migrations/xxxx_create_expenses_table.php
  Expense.php                 → app/Models/Expense.php
  ExpenseController.php       → app/Http/Controllers/Api/ExpenseController.php
  routes_and_controllers.php  → routes/api.php + CategoryController + PersonController
```

---

## 🖥️ Frontend React

### Requisitos
- Node.js 18+
- React 18+
- Vite ou Create React App

### Dependências
```bash
npm install recharts lucide-react
```

### Uso Standalone (Demo)
O arquivo `GestorGastos.jsx` funciona 100% sozinho com dados de exemplo.
Basta importá-lo no seu projeto React:

```jsx
// App.jsx ou main.jsx
import GestorGastos from './GestorGastos';
export default function App() {
  return <GestorGastos />;
}
```

### Integração com a API Laravel
Para conectar ao backend, substitua os estados iniciais por chamadas à API.
Exemplo de fetch das despesas:

```js
// Em vez de: const [expenses, setExpenses] = useState(INIT_EXPENSES)
const [expenses, setExpenses] = useState([]);

useEffect(() => {
  fetch('/api/v1/expenses')
    .then(res => res.json())
    .then(data => setExpenses(data.data));
}, []);
```

---

## ⚙️ Backend Laravel

### Requisitos
- PHP 8.2+
- Laravel 11+
- MySQL / PostgreSQL / SQLite

### Instalação

```bash
# 1. Criar projeto Laravel
composer create-project laravel/laravel finance-app
cd finance-app

# 2. Configurar banco no .env
DB_CONNECTION=mysql
DB_DATABASE=finance_app
DB_USERNAME=root
DB_PASSWORD=

# 3. Copiar os arquivos do backend
# migration.php       → database/migrations/
# Expense.php         → app/Models/
# ExpenseController.php → app/Http/Controllers/Api/
# Extraia CategoryController e PersonController de routes_and_controllers.php

# 4. Criar modelos auxiliares
php artisan make:model Category
php artisan make:model Person

# 5. Adicionar ao Category.php:
#   protected $fillable = ['name', 'color', 'icon'];
#   public function expenses() { return $this->hasMany(Expense::class); }

# 6. Adicionar ao Person.php:
#   protected $fillable = ['name'];
#   public function expenses() { return $this->hasMany(Expense::class); }

# 7. Rodar migrations
php artisan migrate

# 8. (Opcional) Seed com dados de exemplo
php artisan db:seed

# 9. Configurar CORS para o frontend
php artisan config:publish cors
# config/cors.php → 'allowed_origins' => ['http://localhost:5173']

# 10. Iniciar servidor
php artisan serve
```

### Endpoints da API

| Método | Endpoint                        | Descrição                        |
|--------|---------------------------------|----------------------------------|
| GET    | /api/v1/expenses                | Listar gastos (com filtros)       |
| POST   | /api/v1/expenses                | Criar gasto                      |
| GET    | /api/v1/expenses/{id}           | Buscar gasto                     |
| PUT    | /api/v1/expenses/{id}           | Atualizar gasto                  |
| DELETE | /api/v1/expenses/{id}           | Excluir gasto                    |
| PATCH  | /api/v1/expenses/{id}/pay       | Marcar como pago                 |
| GET    | /api/v1/expenses/dashboard      | Dados do dashboard               |
| GET    | /api/v1/expenses/alerts         | Alertas de vencimento            |
| GET    | /api/v1/categories              | Listar categorias                |
| POST   | /api/v1/categories              | Criar categoria                  |
| PUT    | /api/v1/categories/{id}         | Atualizar categoria              |
| DELETE | /api/v1/categories/{id}         | Excluir categoria                |
| GET    | /api/v1/people                  | Listar pessoas                   |
| POST   | /api/v1/people                  | Criar pessoa                     |
| DELETE | /api/v1/people/{id}             | Excluir pessoa                   |

### Filtros Disponíveis (GET /api/v1/expenses)
```
?payment_month=2026-03
?category_id=1
?person_id=2
?status=pending|paid|overdue
?search=supermercado
```

### Exemplo de Resposta — Dashboard
```json
{
  "total": 5634.80,
  "paid": 4969.00,
  "pending": 665.80,
  "monthlyChart": [...],
  "byCategory": [
    { "name": "Moradia", "total": 2185.50, "count": 3 },
    { "name": "Alimentação", "total": 606.40, "count": 2 }
  ],
  "alerts": [...]
}
```

---

## ✨ Funcionalidades

### Frontend
- [x] Dashboard com resumo financeiro do mês
- [x] Gráfico de barras — gastos por mês
- [x] Gráfico de pizza — gastos por categoria
- [x] Alertas de vencimento na tela inicial
- [x] CRUD completo de gastos
- [x] Filtros: mês, categoria, pessoa, status, busca
- [x] Campos: descrição, valor, categoria, quem gastou, estabelecimento, forma de pagamento, mês de pagamento, data de vencimento, parcelas, observações
- [x] Marcar como pago com 1 clique
- [x] Tela de alertas com 4 seções (vencidos, hoje, 7 dias, 30 dias)
- [x] Gerenciamento de categorias com cores e ícones
- [x] Gerenciamento de pessoas com resumo financeiro

### Backend
- [x] API REST com validação completa
- [x] Atualização automática de status "overdue"
- [x] Filtros e busca
- [x] Endpoint de dashboard com analytics
- [x] Endpoint de alertas por período
- [x] Proteção: não permite excluir categoria/pessoa em uso

---

## 🔮 Próximos Passos Sugeridos
- Autenticação (Laravel Sanctum) para múltiplos usuários
- Notificações por e-mail (Laravel Mail + Queue)
- Exportação PDF/Excel dos relatórios
- Recorrência automática (gastos mensais fixos)
- App mobile com React Native reutilizando os componentes
