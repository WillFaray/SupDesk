import express from 'express';
import { CreateUser, listUsers } from '../controllers/UserController.js';

const router = express.Router();

router.post('/', CreateUser);
router.get('/', listUsers);

export default router;