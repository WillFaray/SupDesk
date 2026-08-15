import express from 'express';
import { CreateTicket, listTickets, updateTicket, deleteTicket } from '../controllers/TicketController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { CreateTicketSchema, UpdateTicketStatusSchema } from '../schemas/ticketSchema.js';

const router = express.Router();

router.post('/', verifyToken, validate(CreateTicketSchema), CreateTicket);
router.get('/', verifyToken, listTickets);
router.patch('/:id', verifyToken, validate(UpdateTicketStatusSchema), updateTicket);
router.delete('/:id', verifyToken, deleteTicket);

export default router;