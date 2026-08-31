# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Backend incumbente (já existente): Node.js + Express 5 + TypeScript + PostgreSQL (pg), autenticação JWT + bcrypt, validação zod, express-rate-limit, cors, dotenv. API REST servida por `src/server.ts`.
- Frontend a construir (decisão do usuário): React — **Vite ou Next.js (decisão em aberto entre os dois)**.

## Users

- **Funcionários da empresa** (papel `usuario`): têm um problema de TI no dia a dia, abrem um chamado e acompanham a resolução.
- **Equipe de TI interna** (papéis `analista` e `admin`): triam, priorizam, assumem e resolvem os chamados abertos pelos funcionários.

## Product Purpose

Sistema de help desk interno: um funcionário com um problema de TI (hardware, software, rede ou outro) abre um chamado com título, descrição, prioridade e categoria; a equipe de TI o acompanha, comenta, avança o status (Aberto → Em andamento → Resolvido) e o resolve. Sucesso = o problema reportado vira um chamado claro e é resolvido com o mínimo de fricção e máxima rastreabilidade.

## Positioning

Simplicidade: abrir e acompanhar um chamado sem fricção, com fluxos claros por papel (usuario/analista/admin). O mecanismo é o fluxo por papéis — cada perfil tem exatamente o que precisa e nada que o atrapalhe.

## Operating Context

- Idioma do domínio: português (pt-BR) — rotas, colunas, mensagens e valores (`Aberto`, `Em andamento`, `Resolvido`; `Baixa`, `Média`, `Alta`; `Hardware`, `Software`, `Rede`, `Outros`).
- API REST sob `/usuarios`, `/chamados` e `/auth`; autenticação via JWT Bearer (expiração de 8h).
- PostgreSQL com tabelas `users`, `tickets` e `ticket_comments` (esquema em `setup.sql`).
- Limites de taxa: login 5 tentativas/15min por email; registro 3/h por IP; API geral 100 requisições/15min por IP.
- Desenvolvimento local: `.env` com `DB_*`, `PORT` (padrão 3000), `JWT_SECRET` e `CORS_ORIGIN` (padrão `http://localhost:3000`).

## Capabilities and Constraints

Capacidades confirmadas:
- Cadastro e login de usuários; perfil editável (username, email, senha).
- Criação e listagem de chamados com filtros (status, prioridade, categoria), ordenação por criação (desc) e paginação; visualização de chamado individual; atualização de status; exclusão.
- Comentários por chamado, exibidos em ordem de criação, com autor e papel.
- Regras de papel: `usuario` cria e vê apenas os próprios chamados; `analista` e `admin` atualizam status e assumem o chamado como responsável; `admin` também lista usuários e exclui chamados.
- Validação com zod e tratamento centralizado de erros.

Limitações/restrições conhecidas (registradas como fato técnico, não como decisão de produto):
- Sem frontend ainda (em planejamento: React).
- Sem testes automatizados.
- Logout é apenas local (o cliente descarta o token); não há revogação no servidor.
- O cadastro não valida domínio de email corporativo e o papel pode ser escolhido no momento da criação (risco de escalonamento conhecido).
- Sem e-mail/notificações, anexos, SLA/métricas, recuperação de senha ou auditoria.

Decisões em aberto:
- Frontend: Vite vs Next.js.
- Categorias e prioridades fixas vs configuráveis.
- Escopo além do MVP (notificações, anexos, relatórios).

## Brand Commitments

- Nome: **SupDesk**.
- Idioma da interface e do domínio: português (pt-BR).
- Nenhum outro vínculo visual, de voz ou de marca foi declarado como obrigatório.

## Evidence on Hand

- `setup.sql`: esquema do banco (users, tickets, ticket_comments).
- `test.rest`: exercícios manuais dos endpoints, com payloads e respostas reais de exemplo.
- `.env.example`: variáveis de ambiente esperadas.
- Não há testes, README, dados de produção, clientes reais nem depoimentos — nada disso deve ser fabricado.

## Product Principles

1. **Fricção mínima para quem abre o chamado**: campos claros, defaults sensatos (prioridade `Média`, categoria `Outros`) e status que refletem o ciclo real.
2. **Cada papel enxerga só o que precisa**: fluxos distintos e coerentes para `usuario`, `analista` e `admin`.
3. **Rastreabilidade**: histórico de status, responsável e comentários com autor visíveis em cada chamado.
4. **Previsibilidade técnica**: validação, limites de taxa e tratamento de erro consistentes em toda a API.
5. **Simplicidade sobre recursos**: adicionar capacidade somente quando um fluxo real pedir.
