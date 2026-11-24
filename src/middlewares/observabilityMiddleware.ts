import crypto from 'node:crypto';
import type express from 'express';
import type { AuthRequest } from './authMiddleware.js';
import { logger } from '../observability/logger.js';
import {
    mapStatusToErrorMetric,
    normalizeRoutePath,
    recordError,
    recordHttpRequest,
    type ErrorMetricType,
} from '../observability/metrics.js';

const SAFE_REQUEST_ID_REGEX = /^[A-Za-z0-9._-]{1,64}$/;

export interface ObservableRequest extends AuthRequest {
    requestId?: string | undefined;
}

export const extractOrCreateRequestId = (headerValue: unknown): string => {
    if (typeof headerValue === 'string') {
        const trimmed = headerValue.trim();
        if (SAFE_REQUEST_ID_REGEX.test(trimmed)) {
            return trimmed;
        }
    }
    return crypto.randomUUID();
};

export const markErrorRecorded = (res: express.Response, type: ErrorMetricType): void => {
    const resWithLocals = res as { locals?: { errorRecorded?: boolean } };
    resWithLocals.locals ??= {};
    if (!resWithLocals.locals.errorRecorded) {
        resWithLocals.locals.errorRecorded = true;
        recordError(type);
    }
};

export const observabilityMiddleware = (
    req: ObservableRequest,
    res: express.Response,
    next: express.NextFunction,
): void => {
    const requestId = extractOrCreateRequestId(req.headers['x-request-id']);
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const startNs = process.hrtime.bigint();

    res.on('finish', () => {
        const elapsedNs = process.hrtime.bigint() - startNs;
        const durationMs = Math.round((Number(elapsedNs) / 1_000_000) * 100) / 100;
        const rawPath = req.originalUrl || req.url || '/';
        const route = normalizeRoutePath(rawPath);
        const statusCode = res.statusCode;

        recordHttpRequest(req.method, rawPath, statusCode, durationMs);

        if (statusCode >= 400) {
            markErrorRecorded(res, mapStatusToErrorMetric(statusCode));
        }

        const logContext = {
            requestId,
            method: req.method,
            route,
            url: rawPath,
            statusCode,
            durationMs,
            userId: req.user?.id,
        };

        if (statusCode >= 400 && statusCode < 500) {
            logger.warn(`${req.method} ${route} -> ${statusCode}`, logContext);
        } else if (statusCode < 400) {
            logger.info(`${req.method} ${route} -> ${statusCode}`, logContext);
        }
    });

    next();
};
