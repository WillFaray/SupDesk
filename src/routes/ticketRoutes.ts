import express from 'express';
import { CreateTicket, listTickets, updateTicket, deleteTicket } from '../controllers/TicketController.js';

const router = express.Router();

router.post('/', CreateTicket);
router.get('/', listTickets);
router.patch('/:id', updateTicket);
router.delete('/:id', deleteTicket);

export default router;