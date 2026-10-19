import type express from 'express';
import type { z } from 'zod';
import type { AuthRequest } from './authMiddleware.js';

const MAX_POSTGRES_INT4 = 2_147_483_647;
const POSITIVE_INT_REGEX = /^[1-9]\d*$/;

export const parsePositiveIntId = (value: unknown): number | null => {
    if (typeof value === 'number') {
        return Number.isInteger(value) && value >= 1 && value <= MAX_POSTGRES_INT4 ? value : null;
    }
    if (typeof value !== 'string' || !POSITIVE_INT_REGEX.test(value)) {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_POSTGRES_INT4) {
        return null;
    }
    return parsed;
};

export const validateIdParam = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
): void => {
    const parsedId = parsePositiveIntId(req.params.id);
    if (parsedId === null) {
        res.status(400).json({ error: 'Identificador inválido' });
        return;
    }
    next();
};

export const validate = <Output>(schema: z.ZodType<Output>) => {
    return (req: AuthRequest<Output>, res: express.Response, next: express.NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errorMessages = result.error.issues.map((err) => ({
                campo: err.path[0],
                erro: err.message,
            }));

            res.status(400).json({
                error: 'Erro de validação',
                detalhes: errorMessages,
            });
            return;
        }

        req.body = result.data;
        next();
    };
};
