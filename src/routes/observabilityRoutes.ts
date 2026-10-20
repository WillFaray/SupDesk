import express from 'express';
import pool from '../database.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';
import {
    getMetricsSnapshot,
    recordDbHealthCheck,
    type DatabasePoolStats,
} from '../observability/metrics.js';

const router = express.Router();

const getPoolStats = (): DatabasePoolStats => ({
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica a saúde da aplicação e conectividade com o PostgreSQL
 *     tags: [Observabilidade]
 *     responses:
 *       200:
 *         description: Aplicação e banco de dados operacionais
 *       503:
 *         description: Banco de dados indisponível
 */
router.get('/health', async (_req, res) => {
    const startNs = process.hrtime.bigint();
    try {
        await pool.query('SELECT 1');
        const latencyMs =
            Math.round((Number(process.hrtime.bigint() - startNs) / 1_000_000) * 100) / 100;
        recordDbHealthCheck('up', latencyMs);

        res.status(200).json({
            status: 'ok',
            uptimeSeconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
            database: {
                status: 'up',
                latencyMs,
                pool: getPoolStats(),
            },
        });
    } catch {
        const latencyMs =
            Math.round((Number(process.hrtime.bigint() - startNs) / 1_000_000) * 100) / 100;
        recordDbHealthCheck('down', latencyMs);

        res.status(503).json({
            status: 'degraded',
            uptimeSeconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
            database: {
                status: 'down',
                latencyMs,
                pool: getPoolStats(),
            },
        });
    }
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Métricas operacionais da API, rotas, erros, autenticação e banco (somente admin)
 *     tags: [Observabilidade]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Snapshot de métricas operacionais
 *       401:
 *         description: Token inválido, revogado ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acesso negado (requer papel admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/metrics', verifyToken, requireRole('admin'), (_req, res) => {
    res.status(200).json(getMetricsSnapshot(getPoolStats()));
});

export default router;
