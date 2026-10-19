import type express from 'express';
import type { CorsOptions } from 'cors';

export const securityHeaders = (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
};

export const getAllowedOrigins = (rawOrigins = process.env.CORS_ORIGIN): string[] => {
    const fallback = ['http://localhost:3000'];
    if (!rawOrigins || rawOrigins.trim().length === 0) return fallback;
    const parsed = rawOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
    return parsed.length > 0 ? parsed : fallback;
};

export const buildCorsOptions = (rawOrigins = process.env.CORS_ORIGIN): CorsOptions => {
    const allowedOrigins = getAllowedOrigins(rawOrigins);
    return {
        origin: (requestOrigin, callback) => {
            // Requisições same-origin, server-to-server ou ferramentas locais sem header Origin
            if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
                callback(null, true);
                return;
            }
            callback(null, false);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    };
};
