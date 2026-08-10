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

app.get('/usuarios', async (req, res) => {
    try {
        const query = 'SELECT id, username, email FROM users';
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.post('/chamados', async (req, res) => {
    try {
        const { user_id, title, description } = req.body;
        const query = 'INSERT INTO tickets (user_id, title, description) VALUES ($1, $2, $3) RETURNING *';
        const values = [user_id, title, description];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar chamado' });
    }
});

app.patch('/chamados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const query = 'UPDATE tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        const values = [status, id];
        const result = await pool.query(query, values);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar chamado' });
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
})