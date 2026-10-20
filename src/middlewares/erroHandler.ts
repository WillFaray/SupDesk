import type express from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { logger, sanitizeForLog } from '../observability/logger.js';
import { recordDbError, type ErrorMetricType } from '../observability/metrics.js';
import { markErrorRecorded, type ObservableRequest } from './observabilityMiddleware.js';

export { sanitizeForLog };

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

const mapPostgresError = (
    err: unknown,
): { statusCode: number; error: string; metricType: ErrorMetricType } | null => {
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
                metricType: 'conflict',
            };
        }
        case '23503':
            return {
                statusCode: 400,
                error: 'Referência inválida para o recurso informado.',
                metricType: 'validation_error',
            };
        case '23502':
            return {
                statusCode: 400,
                error: 'Campo obrigatório não informado.',
                metricType: 'validation_error',
            };
        case '23514':
            return {
                statusCode: 400,
                error: 'Valor inválido para as regras do recurso.',
                metricType: 'validation_error',
            };
        case '22P02':
            return {
                statusCode: 400,
                error: 'Identificador inválido',
                metricType: 'validation_error',
            };
        case '22001':
            return {
                statusCode: 400,
                error: 'Valor excede o tamanho máximo permitido.',
                metricType: 'validation_error',
            };
        case '22003':
            return {
                statusCode: 400,
                error: 'Identificador inválido',
                metricType: 'validation_error',
            };
        default:
            return null;
    }
};

const mapStatusToErrorMetric = (statusCode: number): ErrorMetricType => {
    switch (statusCode) {
        case 400:
            return 'validation_error';
        case 401:
            return 'unauthorized';
        case 403:
            return 'forbidden';
        case 404:
            return 'not_found';
        case 409:
            return 'conflict';
        case 413:
            return 'payload_too_large';
        case 429:
            return 'rate_limit';
        default:
            return statusCode >= 500 ? 'internal_error' : 'validation_error';
    }
};

export const errorHandler = (
    err: Error,
    req: ObservableRequest,
    res: express.Response,
    _next: express.NextFunction,
) => {
    if (err instanceof AppError) {
        markErrorRecorded(res, mapStatusToErrorMetric(err.statusCode));
        return res.status(err.statusCode).json({
            error: err.message,
            ...(err.detalhes ? { detalhes: err.detalhes } : {}),
        });
    }

    if (err instanceof ZodError) {
        markErrorRecorded(res, 'validation_error');
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
        markErrorRecorded(res, 'malformed_json');
        return res.status(400).json({
            error: 'JSON malformado no corpo da requisição.',
        });
    }

    if (isPayloadTooLargeError(err)) {
        markErrorRecorded(res, 'payload_too_large');
        return res.status(413).json({
            error: 'Corpo da requisição excede o limite permitido.',
        });
    }

    const pgMapped = mapPostgresError(err);
    if (pgMapped) {
        markErrorRecorded(res, pgMapped.metricType);
        return res.status(pgMapped.statusCode).json({
            error: pgMapped.error,
        });
    }

    if (err && typeof err === 'object' && 'code' in err) {
        recordDbError();
        const resWithLocals = res as { locals?: { errorRecorded?: boolean } };
        resWithLocals.locals ??= {};
        resWithLocals.locals.errorRecorded = true;
    } else {
        markErrorRecorded(res, 'internal_error');
    }

    logger.error(err.message ?? 'Erro desconhecido', {
        requestId: req.requestId,
        method: req.method,
        url: req.url ?? '',
        statusCode: 500,
        errorType: 'internal_error',
    });

    return res.status(500).json({
        error: 'Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.',
    });
};
