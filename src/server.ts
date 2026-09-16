import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import authRoutes from './routes/authRoutes.js';
import 'dotenv/config';
import { errorHandler } from './middlewares/erroHandler.js';
import { apiLimiter } from './middlewares/rateLimitMiddleware.js';
import { setupSwagger } from './swagger.js';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não definido em .env');
}

const app = express();
const porta = process.env.PORT || 3000;

setupSwagger(app);

app.use(express.json());
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    }),
);
app.use(apiLimiter);
app.use('/usuarios', userRoutes);
app.use('/chamados', ticketRoutes);
app.use('/auth', authRoutes);

app.use(errorHandler);

app.get('/ping', (req, res) => res.send('Servidor novo rodando!'));
app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});
