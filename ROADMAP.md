# Roadmap de melhorias do SupDesk

## 1) Prioridade máxima — correções de robustez

### P0.1: padronizar erros da API
Objetivo:
- transformar 500s inesperados em respostas previsíveis
- padronizar JSON de erro
- tratar casos como e-mail duplicado, IDs inválidos e payloads malformados

Por quê:
- hoje a aplicação funciona, mas ainda há comportamentos inconsistentes em cenários de erro

Tarefas:
- criar camada central de erro consistente
- mapear exceções do PostgreSQL para status HTTP corretos
- validar IDs em rotas antes do SQL
- ajustar documentação Swagger para refletir o comportamento real

Resultado esperado:
- API previsível, segura e fácil de consumir

---

### P0.2: reforçar segurança básica
Objetivo:
- reduzir riscos de produção sem mudar a arquitetura

Itens:
- limitar campos permitidos em PUT/POST
- revisar sanitização de entradas
- melhorar logs sem expor dados sensíveis
- revisar headers e CORS
- revisar rotas públicas/privadas
- validar expiração e revogação de token em cenários edge

Resultado esperado:
- postura mais segura para uso interno/produção

---

## 2) Prioridade alta — qualidade operacional

### P1.1: observabilidade
Itens:
- logs estruturados
- request IDs
- métricas de uso
- tempo de resposta por rota
- contagem de erros por tipo
- monitoramento de banco e autenticação

Por quê:
- sem isso, o sistema fica difícil de manter quando cresce

Resultado esperado:
- diagnósticos rápidos e menos tempo perdido em produção

---

### P1.2: banco e evolução de schema
Itens:
- migrações versionadas
- seed de dados para ambiente local
- scripts de reset de banco
- padronizar nomes e tipos
- revisar constraints e índices

Por quê:
- a base existe, mas ela precisa evoluir sem quebrar dados antigos

Resultado esperado:
- evolução do sistema sem “travar” o banco

---

### P1.3: cobertura e testes de regressão
Itens:
- ampliar testes para casos de erro reais
- testar cenário de concorrência
- testar permissões em todos os fluxos
- testar dados inválidos em endpoints sensíveis

Por quê:
- hoje a base está forte, mas ainda falta martelar casos de borda

Resultado esperado:
- menos regressões e mais confiança em mudanças

---

## 3) Prioridade média — experiência e produtividade do usuário

### P2.1: melhorar UX do help desk
Itens:
- filtros mais avançados
- ordenação por prioridade, status e data
- busca por texto e por categoria
- resumo por painel
- paginação visual melhor
- melhor feedback de ações do usuário

Por quê:
- o fluxo principal já funciona, mas a experiência ainda é básica

Resultado esperado:
- operação mais rápida para analistas e admins

---

### P2.2: comentários e workflow de resolução
Itens:
- histórico visual mais rico
- marcação de resolução com justificativa
- indicação clara de responsável
- tempo de atendimento
- status por etapas mais explícitas

Resultado esperado:
- processo de suporte mais transparente e administrável

---

### P2.3: ajuda e feedback
Itens:
- mensagens mais amigáveis
- toasts melhores
- estados vazios e erros mais descritivos
- visibilidade do que foi salvo ou rejeitado

Resultado esperado:
- redução de erro operacional do usuário

---

## 4) Prioridade média/alta — funcionalidades de negócio

### P3.1: notificações
- e-mail interno
- notificação no frontend
- alertas de mudança de status
- alertas de chamado atribuído

Por quê:
- o processo de suporte melhora muito com comunicação automatizada

---

### P3.2: anexos e arquivos
- upload de screenshots
- anexos de arquivos de suporte
- preview e armazenamento seguro

Por quê:
- muitas demandas de TI dependem de arquivos anexados

---

### P3.3: SLA e métricas
- tempo médio de resposta
- tempo de resolução
- taxa de chamados por categoria
- indicadores por analista/papel
- painel administrativo

Por quê:
- isso transforma o sistema em ferramenta de gestão, não só de registro

---

### P3.4: recuperação e gestão de contas
- recuperação de senha
- bloqueio temporário de conta
- auditoria de login
- controle de sessão por dispositivo

Resultado esperado:
- maturidade operacional para uso real em empresa

---

## 5) Prioridade baixa, mas importante — arquitetura e evolução

### P4.1: revisão de arquitetura
Itens:
- separar serviços de regra de negócio
- revisar controllers e repositories
- reduzir acoplamento
- definir padrões de projeto
- centralizar validação e autorização

Resultado esperado:
- melhor manutenção e crescimento sem “bola de neve”

---

### P4.2: escalabilidade
Itens:
- caching leve
- fila para tarefas assíncronas
- melhor separação entre execução síncrona e assíncrona
- revisão de consultas ao banco
- preparo para multi-tenancy ou múltiplos ambientes

---

### P4.3: CI/CD e ambiente
Itens:
- pipelines de lint/test/build
- deploy automatizado
- ambientes de staging e produção
- variáveis segregadas por ambiente
- rollback simples

Resultado esperado:
- entrega mais segura e profissional