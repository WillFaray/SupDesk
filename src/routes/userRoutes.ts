import express from 'express';
import { CreateUser, getMe, listUsers, updateUser } from '../controllers/UserController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { requireRole, verifyToken } from '../middlewares/authMiddleware.js';
import { registerLimiter } from '../middlewares/rateLimitMiddleware.js';
import { registerSchema, updateUserSchema } from '../schemas/userSchema.js';

const router = express.Router();

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cadastro público de usuário
 *     description: >
 *       Cria um novo usuário com papel fixo 'usuario'.
 *       O campo `role` NÃO é aceito no body — tentativas de elevar privilégio
 *       são descartadas pelo validador (chaves desconhecidas são removidas).
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password_hash
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 example: joao.silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *               password_hash:
 *                 type: string
 *                 minLength: 8
 *                 example: senhaSegura123
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso (nunca retorna o hash da senha)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [usuario]
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email já cadastrado
 */
router.post('/', registerLimiter, validate(registerSchema), CreateUser);

/**
 * @swagger
 * /usuarios/me:
 *   get:
 *     summary: Dados do próprio usuário autenticado
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [usuario, analista, admin]
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 */
router.get('/me', verifyToken, getMe);

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Lista todos os usuários (somente admin)
 *     description: Requer papel 'admin'. Usuários comuns recebem 403.
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários (sem hashes de senha)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *                     enum: [usuario, analista, admin]
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 *       403:
 *         description: Acesso negado (requer papel admin)
 */
router.get('/', verifyToken, requireRole('admin'), listUsers);

/**
 * @swagger
 * /usuarios:
 *   put:
 *     summary: Atualiza o perfil do usuário autenticado
 *     description: >
 *       Autoatendimento: afeta apenas o próprio usuário do token.
 *       Aceita username, email e/ou password_hash (a senha é re-hasheada).
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *               email:
 *                 type: string
 *                 format: email
 *               password_hash:
 *                 type: string
 *                 minLength: 8
 *                 example: novaSenhaSegura123
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       400:
 *         description: Dados inválidos ou nenhum campo informado
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 */
router.put('/', verifyToken, validate(updateUserSchema), updateUser);

export default router;
