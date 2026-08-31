import express from 'express';
import { login, logout } from '../controllers/AuthController.js';
import { loginLimiter } from '../middlewares/rateLimitMiddleware.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', loginLimiter, login);
router.post('/logout', verifyToken, logout);

export default router;