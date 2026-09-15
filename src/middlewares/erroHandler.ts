import type express from 'express';

export const errorHandler = (
    err: Error,
    req: express.Request,
    res: express.Response,
    // O Express só reconhece um error handler com 4 parâmetros; o nome com
    // underscore sinaliza que ele é intencionalmente não utilizado.
    _next: express.NextFunction,
) => {
    console.error(`[Erro Crítico] ${req.method} ${req.url} ->`, err.message);
    return res.status(500).json({
        status: 'error',
        message: 'Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.',
    });
};
