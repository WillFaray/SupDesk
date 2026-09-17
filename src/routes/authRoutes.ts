import express from 'express';
import { login, logout } from '../controllers/AuthController.js';
import { loginLimiter } from '../middlewares/rateLimitMiddleware.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { loginSchema } from '../schemas/userSchema.js';

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza login do usuário
 *     description: >-
 *       Retorna um JWT válido por 8 horas. Use-o no header
 *       "Authorization: Bearer <token>".
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *               password:
 *                 type: string
 *                 example: senhaSegura123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [usuario, analista, admin]
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', loginLimiter, validate(loginSchema), login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Realiza logout com revogação do token no servidor
 *     description: >
 *       Registra o JWT atual como revogado (por hash SHA-256) até a expiração
 *       original dele. Requests subsequentes com este token recebem 401,
 *       mesmo antes de o token expirar naturalmente.
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado e token revogado no servidor
 *       401:
 *         description: Token inválido, já revogado ou não fornecido
 */
router.post('/logout', verifyToken, logout);

export default router;
