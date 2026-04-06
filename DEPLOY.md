# Publicar GestorGastos (https://gestorgastos.rf.gd/)

## Frontend (React + Vite)

1. Variáveis: `frontend/.env.development` (dev) e `frontend/.env.production` (build). A URL da API em produção é **`https://gestorgastos.rf.gd/api/v1`**.
2. Build:
   ```bash
   cd frontend && npm ci && npm run build
   ```
3. Envie **todo** o conteúdo de **`frontend/dist/`** para o diretório público (ex.: `htdocs` / `public_html`): `index.html`, pasta **`assets/`** e o ficheiro **`.htaccess`** (vem de `frontend/public/` e é copiado no build — rewrites Apache para SPA).

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

---

## InfinityFree e o erro `errors.infinityfree.net` / 404

Se no browser aparece **`GET https://errors.infinityfree.net/errors/404/`**, o servidor **não encontrou** o URL que o app pediu (ex.: `https://gestorgastos.rf.gd/api/v1/categories`). O InfinityFree mostra essa página genérica em vez da resposta JSON da API.

**Causa habitual:** só foi enviado o conteúdo de `frontend/dist/` (HTML/CSS/JS). **Não há Laravel** a servir `/api/v1/*`, logo tudo o que começa por `/api/` devolve 404.

**O que fazer (escolhe uma):**

1. **Laravel no mesmo domínio** — Instalar o backend no alojamento (PHP + Composer no painel ou upload), com `APP_URL` correto, e garantir que o Apache encaminha pedidos para o `index.php` do Laravel (document root = pasta `public` do projeto, ou regras de rewrite documentadas pelo hosting). Sem isso, `/api/v1` nunca existirá.
2. **API noutro sítio** — Alojar a API noutro servidor (VPS, Railway, Render, etc.), copiar a URL base da API (terminando em `/api/v1`) para `frontend/.env.production` como `VITE_API_BASE=...`, correr `npm run build` de novo e enviar o novo `dist/`.
3. **Subdomínio** — Criar algo como `api.teudominio.rf.gd` só para o Laravel e definir `VITE_API_BASE=https://api.teudominio.rf.gd/api/v1` no build do frontend.

Documentação do hosting: [InfinityFree FAQ / KB](https://forum.infinityfree.com/docs?topic=49355).

**Nota:** Planos gratuitos limitam PHP, cron e por vezes **comandos Artisan por SSH**; Laravel pode ser exigente. Se não for viável, usar a opção 2 (API remota) é o caminho mais simples.
