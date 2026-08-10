import express from 'express';
import userRoutes from './routes/userRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';

const app = express();
const porta = 3000;

app.use(express.json());
app.use('/usuarios', userRoutes);
app.use('/chamados', ticketRoutes);

app.get('/ping', (req, res) => res.send('Servidor novo rodando!'));
app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});