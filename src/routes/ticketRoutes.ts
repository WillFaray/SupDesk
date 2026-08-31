import express from 'express';
import { CreateTicket, listTickets, getTicket, updateTicket, deleteTicket, adicionarComentario, listarComentarios } from '../controllers/TicketController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { createTicketSchema, updateTicketStatusSchema, createCommentSchema } from '../schemas/ticketSchema.js';

const router = express.Router();

router.post('/', verifyToken, validate(createTicketSchema), CreateTicket);
router.get('/', verifyToken, listTickets);
router.get('/:id', verifyToken, getTicket);
router.patch('/:id', verifyToken, validate(updateTicketStatusSchema), updateTicket);
router.delete('/:id', verifyToken, deleteTicket);
router.post('/:id/comentarios', verifyToken, validate(createCommentSchema), adicionarComentario);
router.get('/:id/comentarios', verifyToken, listarComentarios);

export default router;