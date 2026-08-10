import express from 'express';
import pool from './database.js';
import bcrypt from 'bcrypt';

const app = express();
app.use(express.json());

app.post('/usuarios', async (req, res) => {
    try {
        const { username, email, password_hash } = req.body;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
        const query = 'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *';
        const values = [username, email, hashedPassword];
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

app.get('/chamados', async (req, res) => {
    try {
        const query = 'SELECT tickets.id, tickets.title, tickets.description, tickets.status, tickets.created_at, tickets.updated_at, users.username AS autor_do_chamado FROM tickets JOIN users ON tickets.user_id = users.id ORDER BY tickets.created_at DESC';
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar chamados' });
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

app.delete('/chamados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'DELETE FROM tickets WHERE id = $1 RETURNING *';
        const values = [id];
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado' });
        }
        res.status(200).json({
            message: 'Chamado excluído com sucesso',
            ticketApagado: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir chamado' });
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
})