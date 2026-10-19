import type express from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

interface PgLikeError extends Error {
    code?: string;
    constraint?: string;
    detail?: string;
}

interface BodyParserLikeError extends Error {
    status?: number;
    statusCode?: number;
    type?: string;
}

const SENSITIVE_PATTERNS: RegExp[] = [
    /(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    /((?:password|password_hash|senha|token|secret|authorization)\s*[=:]\s*)([^\s,&"']+)/gi,
    /(["'](?:password|password_hash|senha|token|secret|authorization)["']\s*:\s*["'])([^"']+)(["'])/gi,
];

export const sanitizeForLog = (input: string): string => {
    let sanitized = input;
    sanitized = sanitized.replace(SENSITIVE_PATTERNS[0]!, '$1[REDACTED]');
    sanitized = sanitized.replace(SENSITIVE_PATTERNS[1]!, '[REDACTED_JWT]');
    sanitized = sanitized.replace(SENSITIVE_PATTERNS[2]!, '$1[REDACTED]');
    sanitized = sanitized.replace(SENSITIVE_PATTERNS[3]!, '$1[REDACTED]$3');
    return sanitized;
};

const isMalformedJsonError = (err: unknown): boolean => {
    if (!(err instanceof SyntaxError)) return false;
    const bodyErr = err as BodyParserLikeError;
    return (
        bodyErr.status === 400 ||
        bodyErr.statusCode === 400 ||
        bodyErr.type === 'entity.parse.failed'
    );
};

const isPayloadTooLargeError = (err: unknown): boolean => {
    if (!(err instanceof Error)) return false;
    const bodyErr = err as BodyParserLikeError;
    return (
        bodyErr.status === 413 || bodyErr.statusCode === 413 || bodyErr.type === 'entity.too.large'
    );
};

const mapPostgresError = (err: unknown): { statusCode: number; error: string } | null => {
    if (!err || typeof err !== 'object' || !('code' in err)) return null;
    const pgErr = err as PgLikeError;
    if (typeof pgErr.code !== 'string') return null;

    switch (pgErr.code) {
        case '23505': {
            const isEmailConflict =
                pgErr.constraint?.includes('email') || pgErr.detail?.includes('(email)');
            return {
                statusCode: 409,
                error: isEmailConflict ? 'Email já cadastrado.' : 'Registro duplicado.',
            };
        }
        case '23503':
            return {
                statusCode: 400,
                error: 'Referência inválida para o recurso informado.',
            };
        case '23502':
            return {
                statusCode: 400,
                error: 'Campo obrigatório não informado.',
            };
        case '23514':
            return {
                statusCode: 400,
                error: 'Valor inválido para as regras do recurso.',
            };
        case '22P02':
            return {
                statusCode: 400,
                error: 'Identificador inválido',
            };
        case '22001':
            return {
                statusCode: 400,
                error: 'Valor excede o tamanho máximo permitido.',
            };
        case '22003':
            return {
                statusCode: 400,
                error: 'Identificador inválido',
            };
        default:
            return null;
    }
};

export const errorHandler = (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            ...(err.detalhes ? { detalhes: err.detalhes } : {}),
        });
    }

    if (err instanceof ZodError) {
        const detalhes = err.issues.map((issue) => ({
            campo: issue.path[0],
            erro: issue.message,
        }));
        return res.status(400).json({
            error: 'Erro de validação',
            detalhes,
        });
    }

    if (isMalformedJsonError(err)) {
        return res.status(400).json({
            error: 'JSON malformado no corpo da requisição.',
        });
    }

    if (isPayloadTooLargeError(err)) {
        return res.status(413).json({
            error: 'Corpo da requisição excede o limite permitido.',
        });
    }

    const pgMapped = mapPostgresError(err);
    if (pgMapped) {
        return res.status(pgMapped.statusCode).json({
            error: pgMapped.error,
        });
    }

    const safeUrl = sanitizeForLog(req.url ?? '');
    const safeMessage = sanitizeForLog(err.message ?? 'Erro desconhecido');
    console.error(`[Erro Crítico] ${req.method} ${safeUrl} ->`, safeMessage);

    return res.status(500).json({
        error: 'Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.',
    });
};
