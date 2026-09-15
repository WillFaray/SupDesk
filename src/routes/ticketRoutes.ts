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
import { verifyToken } from '../middlewares/authMiddleware.js';
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
 *               - titulo
 *               - descricao
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: Problema no sistema
 *               descricao:
 *                 type: string
 *                 example: Descrição detalhada do problema
 *               prioridade:
 *                 type: string
 *                 enum: [baixa, media, alta]
 *                 example: media
 *     responses:
 *       201:
 *         description: Chamado criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido ou não fornecido
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
 *     summary: Atualiza o status de um chamado
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [aberto, em_andamento, resolvido, fechado]
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido ou não fornecido
 *       404:
 *         description: Chamado não encontrado
 */
router.patch('/:id', verifyToken, validate(updateTicketStatusSchema), updateTicket);

/**
 * @swagger
 * /chamados/{id}:
 *   delete:
 *     summary: Remove um chamado
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
 *         description: Token inválido ou não fornecido
 *       404:
 *         description: Chamado não encontrado
 */
router.delete('/:id', verifyToken, deleteTicket);

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
 *               - texto
 *             properties:
 *               texto:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comentário adicionado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido ou não fornecido
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
