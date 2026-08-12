import express from 'express';
import { CreateTicket, listTickets, updateTicket, deleteTicket } from '../controllers/TicketController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, CreateTicket);
router.get('/', verifyToken, listTickets);
router.patch('/:id', verifyToken, updateTicket);
router.delete('/:id', verifyToken, deleteTicket);

export default router;