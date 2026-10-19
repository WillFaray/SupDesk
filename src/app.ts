import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import authRoutes from './routes/authRoutes.js';
import 'dotenv/config';
import { errorHandler } from './middlewares/erroHandler.js';
import { apiLimiter } from './middlewares/rateLimitMiddleware.js';
import { buildCorsOptions, securityHeaders } from './middlewares/securityMiddleware.js';
import { setupSwagger } from './swagger.js';

// Fábrica da aplicação Express, separada do bootstrap (server.ts) para que a
// suíte de testes possa exercitar TODAS as rotas/middlewares com Supertest,
// sem abrir porta nem conflitar com o servidor de desenvolvimento.
export const createApp = (): express.Express => {
    const app = express();

    app.disable('x-powered-by');
    app.use(securityHeaders);

    setupSwagger(app);

    app.use(express.json({ limit: '16kb' }));
    app.use(cors(buildCorsOptions()));
    app.use(apiLimiter);
    app.use('/usuarios', userRoutes);
    app.use('/chamados', ticketRoutes);
    app.use('/auth', authRoutes);

    app.get('/ping', (_req, res) => res.send('Servidor novo rodando!'));

    app.use(errorHandler);

    return app;
};
