import type express from 'express';
import type { z } from 'zod';
import type { AuthRequest } from './authMiddleware.js';

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
