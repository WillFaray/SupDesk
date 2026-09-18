import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import authRoutes from './routes/authRoutes.js';
import 'dotenv/config';
import { errorHandler } from './middlewares/erroHandler.js';
import { apiLimiter } from './middlewares/rateLimitMiddleware.js';
import { setupSwagger } from './swagger.js';

// Fábrica da aplicação Express, separada do bootstrap (server.ts) para que a
// suíte de testes possa exercitar TODAS as rotas/middlewares com Supertest,
// sem abrir porta nem conflitar com o servidor de desenvolvimento.
export const createApp = (): express.Express => {
    const app = express();

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

    return app;
};
