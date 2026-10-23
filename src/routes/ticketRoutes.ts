import express from 'express';
import {
    CreateTicket,
    listTickets,
    getTicket,
    updateTicket,
    deleteTicket,
    adicionarComentario,
    listarComentarios,
    listarHistorico,
} from '../controllers/TicketController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';
import { validate, validateIdParam } from '../middlewares/validateMiddleware.js';
import {
    createTicketSchema,
    updateTicketStatusSchema,
    createCommentSchema,
} from '../schemas/ticketSchema.js';

const router = express.Router();

/**
 * @swagger
 * /chamados:
 *   post:
 *     summary: Cria um novo chamado
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - priority
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: Problema no sistema
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *                 example: Descrição detalhada do problema
 *               priority:
 *                 type: string
 *                 enum: [Baixa, Média, Alta]
 *                 example: Média
 *               category:
 *                 type: string
 *                 enum: [Hardware, Software, Rede, Outros]
 *                 example: Software
 *     responses:
 *       201:
 *         description: Chamado criado com sucesso
 *       400:
 *         description: Dados inválidos ou JSON malformado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', verifyToken, validate(createTicketSchema), CreateTicket);

/**
 * @swagger
 * /chamados:
 *   get:
 *     summary: Lista todos os chamados com filtros, busca, ordenação, resumo e paginação
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Aberto, Em andamento, Resolvido]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Baixa, Média, Alta]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Hardware, Software, Rede, Outros]
 *       - in: query
 *         name: q
 *         description: Busca textual por título, descrição, autor, responsável ou nº do chamado
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, priority, status, updated_at]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Lista paginada de chamados com resumo operacional
 *       401:
 *         description: Token inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', verifyToken, listTickets);

/**
 * @swagger
 * /chamados/{id}:
 *   get:
 *     summary: Busca um chamado pelo ID
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Dados do chamado
 *       400:
 *         description: Identificador inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Chamado não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', verifyToken, validateIdParam, getTicket);

/**
 * @swagger
 * /chamados/{id}:
 *   patch:
 *     summary: Executa uma transição do workflow do chamado (somente admin ou analista)
 *     description: |
 *       Etapas: Aberto (triagem) → Em andamento (atendimento) → Resolvido.
 *       - **Assumir** (→ Em andamento): o executor vira responsável e o 1º atendimento é registrado.
 *       - **Resolver** (→ Resolvido): exige `resolucao` (justificativa, 10–1000 caracteres).
 *       - **Reabrir** (Resolvido → Aberto/Em andamento) e **Devolver à fila** (Em andamento → Aberto): aceitam `motivo` opcional.
 *       Toda transição gera um evento na trilha do chamado (`GET /chamados/{id}/historico`).
 *       Transições concorrentes são serializadas; repetir o status atual retorna 409.
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Aberto, Em andamento, Resolvido]
 *                 example: Resolvido
 *               resolucao:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *                 description: Obrigatória quando status = Resolvido
 *                 example: Driver de vídeo revertido para a versão anterior; equipamento validado com a usuária.
 *               motivo:
 *                 type: string
 *                 maxLength: 500
 *                 description: Opcional ao reabrir ou devolver à fila
 *                 example: Sintoma voltou após reinicialização.
 *     responses:
 *       200:
 *         description: Transição aplicada com sucesso
 *       400:
 *         description: Dados inválidos (inclui resolução sem justificativa) ou identificador inválido
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acesso negado (requer papel admin ou analista)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Chamado não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: O chamado já está no status solicitado (ex. já assumido por outro analista)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
    '/:id',
    verifyToken,
    requireRole('admin', 'analista'),
    validateIdParam,
    validate(updateTicketStatusSchema),
    updateTicket,
);

/**
 * @swagger
 * /chamados/{id}:
 *   delete:
 *     summary: Remove um chamado (somente admin)
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Chamado removido com sucesso
 *       400:
 *         description: Identificador inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acesso negado (requer papel admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Chamado não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', verifyToken, requireRole('admin'), validateIdParam, deleteTicket);

/**
 * @swagger
 * /chamados/{id}/comentarios:
 *   post:
 *     summary: Adiciona um comentário ao chamado
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 example: Já reiniciei o computador e o problema persiste.
 *     responses:
 *       201:
 *         description: Comentário adicionado com sucesso
 *       400:
 *         description: Dados inválidos ou identificador inválido
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Chamado não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/:id/comentarios',
    verifyToken,
    validateIdParam,
    validate(createCommentSchema),
    adicionarComentario,
);

/**
 * @swagger
 * /chamados/{id}/comentarios:
 *   get:
 *     summary: Lista os comentários de um chamado
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Lista de comentários
 *       400:
 *         description: Identificador inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Chamado não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/comentarios', verifyToken, validateIdParam, listarComentarios);

/**
 * @swagger
 * /chamados/{id}/historico:
 *   get:
 *     summary: Lista a trilha de eventos do chamado (abertura, atendimento, resolução, reabertura)
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Eventos em ordem cronológica (tipo, status anterior/novo, detalhe e autor)
 *       400:
 *         description: Identificador inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Chamado não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/historico', verifyToken, validateIdParam, listarHistorico);

export default router;
