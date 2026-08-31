import express from 'express';
import { CreateUser, listUsers, updateUser } from '../controllers/UserController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { registerLimiter } from '../middlewares/rateLimitMiddleware.js';
import { userSchema } from '../schemas/userSchema.js';

const router = express.Router();

router.post('/', registerLimiter, validate(userSchema), CreateUser);
router.get('/', verifyToken, listUsers);
router.put('/', verifyToken, updateUser);

export default router;