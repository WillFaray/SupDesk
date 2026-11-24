import { createApp } from './app.js';
import pool from './database.js';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não definido em .env');
}

const porta = process.env.PORT || 3000;

const server = createApp().listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});

const encerrar = (sinal: string) => {
    console.log(`[server] Sinal ${sinal} recebido. Encerrando conexões...`);
    server.close(() => {
        void pool.end().finally(() => {
            process.exit(0);
        });
    });
};

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));
