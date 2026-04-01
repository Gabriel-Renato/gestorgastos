# Publicar GestorGastos (https://gestorgastos.rf.gd/)

## Frontend (React + Vite)

1. Variáveis: `frontend/.env.development` (dev) e `frontend/.env.production` (build). A URL da API em produção é **`https://gestorgastos.rf.gd/api/v1`**.
2. Build:
   ```bash
   cd frontend && npm ci && npm run build
   ```
3. Envie o conteúdo de **`frontend/dist/`** para o diretório público do site (ex.: `htdocs` ou `public_html`), normalmente como `index.html` + pasta `assets/`.

Se mudares o domínio, edita `frontend/.env.production` (`VITE_API_BASE`) e volta a fazer o build.

## Backend (Laravel)

1. Copia `backend/.env.production.example` para `.env` no servidor, define `APP_KEY` (`php artisan key:generate`), `APP_URL=https://gestorgastos.rf.gd` e base de dados.
2. Na pasta do projeto (não em `public`):
   ```bash
   composer install --no-dev --optimize-autoloader
   php artisan migrate --force
   php artisan config:cache
   php artisan route:cache
   ```
3. O **document root** do Apache deve apontar para **`backend/public`** (ou equivalente no painel do hosting).
4. Garante que as rotas `/api/v1/*` chegam ao Laravel (rewrite para `index.php` — o `.htaccess` em `public` já ajuda).

## Mesmo domínio

Com o SPA e a API em **`https://gestorgastos.rf.gd`**, o browser chama a API na mesma origem; não é obrigatório configurar CORS à parte.

## Custos

Hosting gratuito (ex. InfinityFree / subdomínio `.rf.gd`) costuma impor limites de CPU, sem SSH ou com PHP restrito. Para tráfego maior ou filas, considera VPS ou plano pago.
