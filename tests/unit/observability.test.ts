import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLogEntry, logger } from '../../src/observability/logger.js';
import {
    getMetricsSnapshot,
    normalizeRoutePath,
    recordAuthEvent,
    recordDbError,
    recordDbHealthCheck,
    recordError,
    recordHttpRequest,
    resetMetrics,
} from '../../src/observability/metrics.js';
import { extractOrCreateRequestId } from '../../src/middlewares/observabilityMiddleware.js';
import { buildCorsOptions, getAllowedOrigins } from '../../src/middlewares/securityMiddleware.js';

beforeEach(() => {
    resetMetrics();
});

afterEach(() => {
    delete process.env.LOG_HTTP_IN_TESTS;
    vi.restoreAllMocks();
});

describe('logger estruturado', () => {
    it('gera entrada JSON estruturada com timestamp, level, message e contexto', () => {
        const entry = buildLogEntry('info', 'GET /chamados -> 200', {
            requestId: 'req-123',
            method: 'GET',
            route: '/chamados',
            statusCode: 200,
            durationMs: 12.34,
            userId: 7,
        });

        expect(entry).toMatchObject({
            level: 'info',
            message: 'GET /chamados -> 200',
            requestId: 'req-123',
            method: 'GET',
            route: '/chamados',
            statusCode: 200,
            durationMs: 12.34,
            userId: 7,
        });
        expect(entry.timestamp).toEqual(expect.any(String));
    });

    it('emite logs info e warn quando habilitado e mascara campos sensíveis no error', () => {
        process.env.LOG_HTTP_IN_TESTS = 'true';
        const spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
        const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.info('Requisição concluída', { statusCode: 200 });
        logger.warn('Acesso negado', { statusCode: 403 });
        const entry = logger.error('Falha com Bearer tokenSecreto999', {
            requestId: 'req-abc',
            password: 'SenhaSuperSecreta',
            url: '/auth/login?token=xyz987',
        });

        expect(spyInfo).toHaveBeenCalledOnce();
        expect(spyWarn).toHaveBeenCalledOnce();
        expect(spyError).toHaveBeenCalledOnce();
        expect(entry.message).toContain('[REDACTED]');
        expect(entry.message).not.toContain('tokenSecreto999');
        expect(entry.password).toBe('[REDACTED]');
        expect(entry.url).not.toContain('xyz987');
    });
});

describe('extractOrCreateRequestId e CORS', () => {
    it('reaproveita X-Request-Id válido enviado pelo cliente', () => {
        expect(extractOrCreateRequestId('req_cliente-001.abc')).toBe('req_cliente-001.abc');
    });

    it('gera UUID novo quando o header está ausente ou contém formato inseguro', () => {
        const geradoVazio = extractOrCreateRequestId(undefined);
        const geradoInvalido = extractOrCreateRequestId('id com espaços e <script>');
        const geradoLongo = extractOrCreateRequestId('a'.repeat(65));

        expect(geradoVazio).toMatch(/^[0-9a-f-]{36}$/i);
        expect(geradoInvalido).toMatch(/^[0-9a-f-]{36}$/i);
        expect(geradoLongo).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('parseia origens permitidas do CORS e valida origem no callback', () => {
        expect(getAllowedOrigins('')).toEqual(['http://localhost:3000']);
        expect(getAllowedOrigins('   ,  ')).toEqual(['http://localhost:3000']);
        expect(getAllowedOrigins('http://localhost:3000, http://localhost:5173')).toEqual([
            'http://localhost:3000',
            'http://localhost:5173',
        ]);

        const opts = buildCorsOptions('http://localhost:3000,http://localhost:5173');
        const originFn = opts.origin as (
            origin: string | undefined,
            cb: (err: Error | null, allow?: boolean) => void,
        ) => void;

        const cbPermitida = vi.fn();
        originFn('http://localhost:5173', cbPermitida);
        expect(cbPermitida).toHaveBeenCalledWith(null, true);

        const cbBloqueada = vi.fn();
        originFn('https://atacante.com', cbBloqueada);
        expect(cbBloqueada).toHaveBeenCalledWith(null, false);
    });
});

describe('normalizeRoutePath e métricas operacionais', () => {
    it('normaliza rotas parametrizadas e remove query strings', () => {
        expect(normalizeRoutePath('/chamados?page=1&limit=10')).toBe('/chamados');
        expect(normalizeRoutePath('/chamados/42')).toBe('/chamados/:id');
        expect(normalizeRoutePath('/chamados/42/comentarios?foo=bar')).toBe(
            '/chamados/:id/comentarios',
        );
        expect(normalizeRoutePath('/usuarios/me/')).toBe('/usuarios/me');
    });

    it('agrega tempo de resposta por rota, classes de status (2xx, 3xx, 4xx, 5xx), erros e banco', () => {
        recordHttpRequest('GET', '/chamados/10', 200, 10);
        recordHttpRequest('GET', '/chamados/25', 304, 30);
        recordHttpRequest('GET', '/chamados/abc', 400, 5);
        recordHttpRequest('POST', '/auth/login', 500, 20);

        recordError('validation_error');
        recordError('unauthorized');
        recordAuthEvent('loginFailure');
        recordAuthEvent('loginSuccess');
        recordDbError();
        recordDbHealthCheck('down', 15.2);

        const snapshot = getMetricsSnapshot({ totalCount: 2, idleCount: 2, waitingCount: 0 });

        expect(snapshot.requests.total).toBe(4);
        expect(snapshot.requests.byStatusClass).toEqual({
            '2xx': 1,
            '3xx': 1,
            '4xx': 1,
            '5xx': 1,
        });
        expect(snapshot.routes['GET /chamados/:id']).toEqual({
            count: 3,
            errors: 1,
            totalDurationMs: 45,
            avgDurationMs: 15,
            minDurationMs: 5,
            maxDurationMs: 30,
            lastDurationMs: 5,
        });
        expect(snapshot.errorsByType.validation_error).toBe(1);
        expect(snapshot.errorsByType.unauthorized).toBe(1);
        expect(snapshot.errorsByType.database_error).toBe(1);
        expect(snapshot.auth.loginFailure).toBe(1);
        expect(snapshot.auth.loginSuccess).toBe(1);
        expect(snapshot.database).toMatchObject({
            errors: 2,
            lastStatus: 'down',
            lastLatencyMs: 15.2,
            pool: { totalCount: 2, idleCount: 2, waitingCount: 0 },
        });
    });
});
