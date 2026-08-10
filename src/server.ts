import express from 'express';
import pool from './database.js';

const app = express();
app.use(express.json());

app.post('/usuarios', async (req, res) => {
    try {
        const { username, email, password_hash } = req.body;
        const query = 'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *';
        const values = [username, email, password_hash];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
})