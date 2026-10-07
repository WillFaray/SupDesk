# Roadmap de melhorias do SupDesk

Este roadmap organiza a evolução da plataforma SupDesk por prioridade (P0 a P4), com itens objetivos, resultados esperados e fases sugeridas para execução.

## P0 — Prioridade máxima (robustez e segurança)

### P0.1 — Padronizar erros da API
- Criar uma camada central de tratamento de erros.
- Padronizar o formato JSON das respostas de erro.
- Mapear exceções do PostgreSQL para status HTTP adequados.
- Validar IDs antes da execução de SQL.
- Tratar e-mail duplicado, IDs inválidos e payloads malformados.
- Atualizar a documentação Swagger para refletir o comportamento real.

**Resultado esperado:** API previsível, segura e fácil de consumir, com redução de respostas 500 inesperadas.

### P0.2 — Reforçar segurança básica
- Limitar os campos permitidos em requisições PUT/POST.
- Revisar a sanitização de entradas.
- Melhorar logs sem expor dados sensíveis.
- Revisar headers e CORS.
- Revisar rotas públicas e privadas.
- Validar expiração e revogação de tokens em cenários de borda.

**Resultado esperado:** postura de segurança mais sólida para uso interno e produção, sem alterar a arquitetura atual.

## P1 — Prioridade alta (qualidade operacional)

### P1.1 — Observabilidade
- Implementar logs estruturados e request IDs.
- Adicionar métricas de uso e tempo de resposta por rota.
- Contabilizar erros por tipo.
- Monitorar banco de dados e autenticação.

**Resultado esperado:** diagnóstico mais rápido de incidentes e menor tempo de resolução em produção.

### P1.2 — Banco e evolução de schema
- Adotar migrações versionadas.
- Criar seed de dados para ambiente local.
- Criar scripts de reset do banco.
- Padronizar nomes e tipos.
- Revisar constraints e índices.

**Resultado esperado:** evolução controlada do banco sem quebra de dados existentes.

### P1.3 — Cobertura e testes de regressão
- Ampliar testes para cenários reais de erro.
- Testar concorrência.
- Testar permissões em todos os fluxos.
- Testar dados inválidos em endpoints sensíveis.

**Resultado esperado:** menos regressões e maior confiança nas mudanças.

## P2 — Prioridade média (experiência e produtividade)

### P2.1 — Melhorar UX do help desk
- Adicionar filtros avançados, busca por texto e categoria.
- Permitir ordenação por prioridade, status e data.
- Melhorar resumo do painel e paginação.
- Melhorar feedback das ações do usuário.

**Resultado esperado:** operação mais fluida para analistas e melhor experiência de uso no dia a dia.

### P2.2 — Comentários e workflow de resolução
- Criar histórico visual mais rico.
- Registrar justificativa de resolução.
- Indicar claramente o responsável.
- Exibir tempo de atendimento.
- Tornar as etapas de status mais explícitas.

**Resultado esperado:** rastreabilidade completa do ciclo do chamado e melhor governança operacional.

### P2.3 — Ajuda e feedback
- Melhorar mensagens, toasts, estados vazios e descrições de erro.
- Dar visibilidade ao que foi salvo ou rejeitado.

**Resultado esperado:** redução de dúvidas operacionais e menor retrabalho por erro de entendimento.

## P3 — Prioridade média/alta (funcionalidades de negócio)

### P3.1 — Notificações
- E-mail interno.
- Notificações no frontend.
- Alertas de mudança de status.
- Alertas de chamado atribuído.

**Resultado esperado:** usuários e analistas atualizados em tempo hábil sobre eventos críticos dos chamados.

### P3.2 — Anexos e arquivos
- Upload de screenshots e arquivos de suporte.
- Preview.
- Armazenamento seguro.

**Resultado esperado:** maior contexto técnico nos chamados e aceleração da análise/resolução.

### P3.3 — SLA e métricas
- Tempo médio de resposta e resolução.
- Taxa de chamados por categoria.
- Indicadores por analista e papel.
- Painel administrativo.

**Resultado esperado:** gestão baseada em dados, com monitoramento de desempenho e gargalos.

### P3.4 — Recuperação e gestão de contas
- Recuperação de senha.
- Bloqueio temporário de conta.
- Auditoria de login.
- Controle de sessão por dispositivo.

**Resultado esperado:** mais autonomia do usuário final e melhor controle de segurança de acesso.

## P4 — Prioridade baixa (arquitetura e evolução)

### P4.1 — Revisão de arquitetura
- Separar serviços de regra de negócio.
- Revisar controllers e repositories.
- Reduzir acoplamento.
- Definir padrões de projeto.
- Centralizar validação e autorização.

**Resultado esperado:** base de código mais modular, manutenível e escalável.

### P4.2 — Escalabilidade
- Implementar caching leve.
- Adicionar fila para tarefas assíncronas.
- Separar melhor execução síncrona e assíncrona.
- Revisar consultas ao banco.
- Preparar o sistema para múltiplos ambientes ou multi-tenancy.

**Resultado esperado:** melhor desempenho e maior capacidade de crescimento com estabilidade.

### P4.3 — CI/CD e ambiente
- Criar pipelines de lint, teste e build.
- Automatizar deploy.
- Configurar staging e produção.
- Segregar variáveis por ambiente.
- Implementar rollback simples.

**Resultado esperado:** entregas mais seguras, previsíveis e com recuperação rápida em falhas.

## Fases sugeridas

### Fase 1 — 2 a 4 semanas
- Padronização de respostas de erro.
- Tratamento dos 500s conhecidos.
- Revisão de segurança básica.
- Melhoria dos logs.
- Correção de autorização e validação nos casos críticos.

### Fase 2 — 1 a 2 meses
- Observabilidade.
- Migrações e evolução de schema.
- Melhorias de UX da fila.
- Testes de regressão mais completos.
- Painel básico de métricas.

### Fase 3 — 2 a 3 meses
- Notificações.
- Anexos.
- Recuperação de senha.
- Gestão de contas e auditoria.
- Dashboard administrativo.

### Fase 4 — Longo prazo
- Arquitetura mais modular.
- Automações e integrações.
- Robustez de produção e deploy.

## Recomendação final

1. Iniciar pelo bloco P0 (erros e segurança) para estabilizar a base.
2. Executar P1 em paralelo por frentes (observabilidade, banco e testes).
3. Priorizar P2 para ganho rápido de produtividade operacional.
4. Planejar P3 por impacto de negócio (notificações + métricas primeiro).
5. Tratar P4 como trilha contínua de maturidade técnica e escala.
6. Decompor cada item `P0.x` a `P4.x` em milestones/issues para gestão incremental.
