# SupDesk

Sistema de help desk interno. Funcionários abrem chamados de TI (título, descrição, prioridade e categoria) e a equipe de TI acompanha, comenta e resolve (Aberto → Em andamento → Resolvido).

> ⚠️ Projeto em fase inicial (MVP). A documentação abaixo cobre apenas instalação e operação básicas em ambiente local.

## Stack

- **Backend:** Node.js + Express 5 + TypeScript, PostgreSQL (pg), autenticação JWT + bcrypt, validação com zod, rate limiting, Swagger.
- **Frontend:** React 18 + Vite (workspace `web`).

## Requisitos

- Node.js 18+
- PostgreSQL

## Instalação

```bash
# 1. Clonar e instalar dependências (raiz + workspace web)
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env com suas credenciais
```

Variáveis esperadas no `.env`:

```env
DB_USER=seu_usuario_postgres
DB_HOST=localhost
DB_NAME=supdesk
DB_PASSWORD=sua_senha_postgres
DB_PORT=5432
PORT=3000
JWT_SECRET=uma_chave_secreta_forte
CORS_ORIGIN=http://localhost:3000
```

```bash
# 3. Criar o banco e o esquema (usuário, chamados, comentários e tokens revogados)
createdb supdesk
psql -d supdesk -f setup.sql
```

## Operação

### Backend (API)

```bash
npm run dev        # desenvolvimento (tsx watch, porta configurada em PORT)
npm run build      # compila para ./dist
npm run start      # roda o build de produção
```

A API fica em `http://localhost:<PORT>` com as rotas `/auth`, `/usuarios` e `/chamados`. A documentação interativa (Swagger) está em `http://localhost:<PORT>/api-docs`.

### Frontend (web)

```bash
npm run dev:web    # Vite em desenvolvimento
npm run build:web  # build de produção
```

### Utilidades

```bash
npm run typecheck  # TypeScript na raiz e no workspace web
npm run lint       # ESLint
npm run format     # Prettier
```

### Testes

Duas suítes Vitest, executadas juntas por `npm test`:

```bash
npm test              # API + frontend
npm run test:api      # backend: unitários + integração (supertest + Postgres)
npm run test:web      # frontend: unitários + integração (jsdom + Testing Library)
npm run test:coverage # cobertura das duas suítes (v8)
```

- **Backend — unitários** (`tests/unit`): schemas Zod, `errorHandler`, `validateMiddleware` e `authMiddleware` (token válido/expirado/revogado).
- **Backend — integração** (`tests/integration`): rotas reais do Express via `supertest`, contra um banco Postgres de teste. O `tests/globalSetup.ts` lê as credenciais do `.env`, cria o schema a partir do `setup.sql` e limpa as tabelas entre execuções.
- **Frontend — unitários** (`web/src/**/*.test.tsx`): cliente HTTP, contexto de auth, hooks de dados, componentes (Modal, Toast, FilterSelect, QueueTable, SearchBox, ThreadComentarios, ErrorBoundary) e a `LoginView`.
- **Frontend — integração** (`web/src/App.test.tsx`): fluxos completos navegando pelo router em memória (fila, assumir chamado, painel, usuários, abertura e detalhe de chamado) com a camada `lib/api` mockada.

O banco de teste é isolado do banco de desenvolvimento, mas cada caso trunca as tabelas — para rodar **duas suítes do backend ao mesmo tempo** (CI paralelo, por exemplo), isole os bancos com `DB_TEST_NAME`:

```bash
DB_TEST_NAME=supdesk_test_b npm run test:api
```

## Papéis

- **usuario:** cria e acompanha apenas os seus chamados.
- **analista / admin:** atualizam status e assumem chamados; admin também lista usuários e exclui chamados.

A promoção para `analista`/`admin` é feita diretamente no banco por um administrador:

```sql
UPDATE users SET role = 'admin' WHERE email = 'fulano@teste.com';
```

### Autorização

- **A fronteira de segurança é o backend.** Toda rota autenticada passa por `verifyToken` + `requireRole`; acesso com papel insuficiente responde **403** (`Acesso negado. Requer papel: admin.`) e sem token válido responde **401**.
- **O papel vem do banco, não do JWT.** O `requireRole` usa o papel atual lido de `users` a cada requisição — o papel gravado no token é apenas uma dica. Assim, rebaixar um admin (ou removê-lo) invalida o acesso na hora, sem esperar as 8 h de expiração do token; promover alguém também vale imediatamente.
- A mesma consulta (`src/authSession.ts`) também detecta **conta removida** (401) e **token revogado no logout** (401).
- **O frontend é UX, não segurança.** A rota `/usuarios` usa `<RoleGuard papel="admin">`: quem não é admin vê a tela de "Acesso negado" em vez de uma página que só falharia no fetch. Como o papel é lido do `localStorage`, isso pode ser burlado localmente — o 403 do backend é o que garante a proteção.

## Status do projeto

- Suite de testes automatizados (Vitest) cobrindo backend (unitários + integração) e frontend (unitários + integração).
- Sem notificações, anexos, SLA/métricas ou recuperação de senha.
- Estrutura da API também exercitável manualmente via `test.rest`.
