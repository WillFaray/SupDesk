import express from 'express';
import userRoutes from './routes/userRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import authRoutes from './routes/authRoutes.js';
import 'dotenv/config';
import { errorHandler } from './middlewares/erroHandler.js';

const app = express();
const porta = process.env.PORT || 3000;

app.use(express.json());
app.use('/usuarios', userRoutes);
app.use('/chamados', ticketRoutes);
app.use('/auth', authRoutes);

app.use(errorHandler);

app.get('/ping', (req, res) => res.send('Servidor novo rodando!'));
app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});