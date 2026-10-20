export type ErrorMetricType =
    | 'validation_error'
    | 'malformed_json'
    | 'payload_too_large'
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'rate_limit'
    | 'database_error'
    | 'internal_error';

export type AuthMetricEvent =
    | 'loginSuccess'
    | 'loginFailure'
    | 'logout'
    | 'tokenRejected'
    | 'tokenRevokedRejected'
    | 'forbiddenAccess';

export interface RouteTimingMetric {
    count: number;
    errors: number;
    totalDurationMs: number;
    avgDurationMs: number;
    minDurationMs: number;
    maxDurationMs: number;
    lastDurationMs: number;
}

export interface DatabasePoolStats {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
}

export interface MetricsSnapshot {
    uptimeSeconds: number;
    timestamp: string;
    requests: {
        total: number;
        byStatusClass: {
            '2xx': number;
            '3xx': number;
            '4xx': number;
            '5xx': number;
        };
        byMethod: Record<string, number>;
    };
    routes: Record<string, RouteTimingMetric>;
    errorsByType: Record<ErrorMetricType, number>;
    auth: Record<AuthMetricEvent, number>;
    database: {
        errors: number;
        lastCheckAt: string | null;
        lastLatencyMs: number | null;
        lastStatus: 'up' | 'down' | 'unknown';
        pool: DatabasePoolStats;
    };
}

const createInitialErrorsByType = (): Record<ErrorMetricType, number> => ({
    validation_error: 0,
    malformed_json: 0,
    payload_too_large: 0,
    unauthorized: 0,
    forbidden: 0,
    not_found: 0,
    conflict: 0,
    rate_limit: 0,
    database_error: 0,
    internal_error: 0,
});

const createInitialAuthMetrics = (): Record<AuthMetricEvent, number> => ({
    loginSuccess: 0,
    loginFailure: 0,
    logout: 0,
    tokenRejected: 0,
    tokenRevokedRejected: 0,
    forbiddenAccess: 0,
});

let totalRequests = 0;
let byStatusClass = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
let byMethod: Record<string, number> = {};
let routes: Record<string, RouteTimingMetric> = {};
let errorsByType: Record<ErrorMetricType, number> = createInitialErrorsByType();
let authMetrics: Record<AuthMetricEvent, number> = createInitialAuthMetrics();
let dbErrors = 0;
let dbLastCheckAt: string | null = null;
let dbLastLatencyMs: number | null = null;
let dbLastStatus: 'up' | 'down' | 'unknown' = 'unknown';

/**
 * Normaliza o caminho da requisição para evitar cardinalidade infinita
 * por IDs ou segmentos variáveis nas métricas por rota.
 */
export const normalizeRoutePath = (rawPath: string): string => {
    const withoutQuery = rawPath.split('?')[0] || '/';
    const collapsed = withoutQuery.replace(/\/+/g, '/');
    if (collapsed.startsWith('/chamados/')) {
        const parts = collapsed.split('/').filter(Boolean);
        // /chamados/:id ou /chamados/:id/comentarios
        if (parts.length === 2) {
            return '/chamados/:id';
        }
        if (parts.length === 3 && parts[2] === 'comentarios') {
            return '/chamados/:id/comentarios';
        }
    }
    return collapsed.length > 1 && collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
};

export const recordHttpRequest = (
    method: string,
    rawPath: string,
    statusCode: number,
    durationMs: number,
): void => {
    const roundedDuration = Math.round(durationMs * 100) / 100;
    const upperMethod = method.toUpperCase();
    const routeKey = `${upperMethod} ${normalizeRoutePath(rawPath)}`;

    totalRequests += 1;
    byMethod[upperMethod] = (byMethod[upperMethod] ?? 0) + 1;

    if (statusCode >= 200 && statusCode < 300) byStatusClass['2xx'] += 1;
    else if (statusCode >= 300 && statusCode < 400) byStatusClass['3xx'] += 1;
    else if (statusCode >= 400 && statusCode < 500) byStatusClass['4xx'] += 1;
    else if (statusCode >= 500) byStatusClass['5xx'] += 1;

    const existing = routes[routeKey];
    if (!existing) {
        routes[routeKey] = {
            count: 1,
            errors: statusCode >= 400 ? 1 : 0,
            totalDurationMs: roundedDuration,
            avgDurationMs: roundedDuration,
            minDurationMs: roundedDuration,
            maxDurationMs: roundedDuration,
            lastDurationMs: roundedDuration,
        };
        return;
    }

    existing.count += 1;
    if (statusCode >= 400) existing.errors += 1;
    existing.totalDurationMs = Math.round((existing.totalDurationMs + roundedDuration) * 100) / 100;
    existing.avgDurationMs = Math.round((existing.totalDurationMs / existing.count) * 100) / 100;
    existing.minDurationMs = Math.min(existing.minDurationMs, roundedDuration);
    existing.maxDurationMs = Math.max(existing.maxDurationMs, roundedDuration);
    existing.lastDurationMs = roundedDuration;
};

export const recordError = (type: ErrorMetricType): void => {
    errorsByType[type] = (errorsByType[type] ?? 0) + 1;
};

export const recordAuthEvent = (event: AuthMetricEvent): void => {
    authMetrics[event] = (authMetrics[event] ?? 0) + 1;
};

export const recordDbError = (): void => {
    dbErrors += 1;
    errorsByType.database_error += 1;
};

export const recordDbHealthCheck = (status: 'up' | 'down', latencyMs: number): void => {
    dbLastCheckAt = new Date().toISOString();
    dbLastLatencyMs = Math.round(latencyMs * 100) / 100;
    dbLastStatus = status;
    if (status === 'down') {
        dbErrors += 1;
    }
};

export const getMetricsSnapshot = (poolStats: DatabasePoolStats): MetricsSnapshot => ({
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    requests: {
        total: totalRequests,
        byStatusClass: { ...byStatusClass },
        byMethod: { ...byMethod },
    },
    routes: structuredClone(routes),
    errorsByType: { ...errorsByType },
    auth: { ...authMetrics },
    database: {
        errors: dbErrors,
        lastCheckAt: dbLastCheckAt,
        lastLatencyMs: dbLastLatencyMs,
        lastStatus: dbLastStatus,
        pool: { ...poolStats },
    },
});

export const resetMetrics = (): void => {
    totalRequests = 0;
    byStatusClass = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    byMethod = {};
    routes = {};
    errorsByType = createInitialErrorsByType();
    authMetrics = createInitialAuthMetrics();
    dbErrors = 0;
    dbLastCheckAt = null;
    dbLastLatencyMs = null;
    dbLastStatus = 'unknown';
};
