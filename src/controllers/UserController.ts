import express from 'express';
import pool from '../database.js';
import bcrypt from 'bcrypt';

export const CreateUser = async (req: express.Request, res: express.Response) => {
    try {
        const { username, email, password_hash, role } = req.body;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
        const query = 'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *';
        const values = [username, email, hashedPassword, role];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};

export const listUsers = async (req: express.Request, res: express.Response) => {
    try {
        const result = await pool.query('SELECT id, username, email FROM users');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};  