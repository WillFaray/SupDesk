import express from 'express';
import { CreateUser, listUsers } from '../controllers/UserController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { userSchema } from '../schemas/userSchema.js';

const router = express.Router();

router.post('/', validate(userSchema), CreateUser);
router.get('/', listUsers);

export default router;