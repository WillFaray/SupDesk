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

## Papéis

- **usuario:** cria e acompanha apenas os seus chamados.
- **analista / admin:** atualizam status e assumem chamados; admin também lista usuários e exclui chamados.

A promoção para `analista`/`admin` é feita diretamente no banco por um administrador:

```sql
UPDATE users SET role = 'admin' WHERE email = 'fulano@teste.com';
```

## Status do projeto

- Sem testes automatizados.
- Sem notificações, anexos, SLA/métricas ou recuperação de senha.
- Estrutura da API exercitável manualmente via `test.rest`.
