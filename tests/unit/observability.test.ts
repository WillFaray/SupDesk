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

beforeEach(() => {
    resetMetrics();
});

afterEach(() => {
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

    it('mascara campos e valores sensíveis no logger estruturado', () => {
        const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const entry = logger.error('Falha com Bearer tokenSecreto999', {
            requestId: 'req-abc',
            password: 'SenhaSuperSecreta',
            url: '/auth/login?token=xyz987',
        });

        expect(entry.message).toContain('[REDACTED]');
        expect(entry.message).not.toContain('tokenSecreto999');
        expect(entry.password).toBe('[REDACTED]');
        expect(entry.url).not.toContain('xyz987');
        expect(spyError).toHaveBeenCalledOnce();
    });
});

describe('extractOrCreateRequestId', () => {
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

    it('agrega tempo de resposta por rota, classes de status, erros por tipo e eventos de auth', () => {
        recordHttpRequest('GET', '/chamados/10', 200, 10);
        recordHttpRequest('GET', '/chamados/25', 200, 30);
        recordHttpRequest('GET', '/chamados/abc', 400, 5);
        recordHttpRequest('POST', '/auth/login', 401, 20);

        recordError('validation_error');
        recordError('unauthorized');
        recordAuthEvent('loginFailure');
        recordAuthEvent('loginSuccess');
        recordDbError();
        recordDbHealthCheck('up', 2.5);

        const snapshot = getMetricsSnapshot({ totalCount: 2, idleCount: 2, waitingCount: 0 });

        expect(snapshot.requests.total).toBe(4);
        expect(snapshot.requests.byStatusClass).toEqual({
            '2xx': 2,
            '3xx': 0,
            '4xx': 2,
            '5xx': 0,
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
            errors: 1,
            lastStatus: 'up',
            lastLatencyMs: 2.5,
            pool: { totalCount: 2, idleCount: 2, waitingCount: 0 },
        });
    });
});
