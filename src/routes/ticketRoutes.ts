import express from 'express';
import {
    CreateTicket,
    listTickets,
    getTicket,
    updateTicket,
    deleteTicket,
    adicionarComentario,
    listarComentarios,
} from '../controllers/TicketController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
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
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 */
router.post('/', verifyToken, validate(createTicketSchema), CreateTicket);

/**
 * @swagger
 * /chamados:
 *   get:
 *     summary: Lista todos os chamados
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de chamados
 *       401:
 *         description: Token inválido ou não fornecido
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
 *     responses:
 *       200:
 *         description: Dados do chamado
 *       401:
 *         description: Token inválido ou não fornecido
 *       404:
 *         description: Chamado não encontrado
 */
router.get('/:id', verifyToken, getTicket);

/**
 * @swagger
 * /chamados/{id}:
 *   patch:
 *     summary: Atualiza o status de um chamado (somente admin ou analista)
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *                 example: Em andamento
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 *       403:
 *         description: Acesso negado (requer papel admin ou analista)
 *       404:
 *         description: Chamado não encontrado
 */
router.patch(
    '/:id',
    verifyToken,
    requireRole('admin', 'analista'),
    validate(updateTicketStatusSchema),
    updateTicket,
);

/**
 * @swagger
 * /chamados/{id}:
 *   delete:
 *     summary: Remove um chamado (somente admin ou analista)
 *     tags: [Chamados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chamado removido com sucesso
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 *       403:
 *         description: Acesso negado (requer papel admin ou analista)
 *       404:
 *         description: Chamado não encontrado
 */
router.delete('/:id', verifyToken, requireRole('admin', 'analista'), deleteTicket);

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
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 *       404:
 *         description: Chamado não encontrado
 */
router.post('/:id/comentarios', verifyToken, validate(createCommentSchema), adicionarComentario);

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
 *     responses:
 *       200:
 *         description: Lista de comentários
 *       401:
 *         description: Token inválido ou não fornecido
 *       404:
 *         description: Chamado não encontrado
 */
router.get('/:id/comentarios', verifyToken, listarComentarios);

export default router;
