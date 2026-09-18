import { createApp } from './app.js';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não definido em .env');
}

const porta = process.env.PORT || 3000;

createApp().listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});
