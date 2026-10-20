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

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
    requestId?: string | undefined;
    method?: string | undefined;
    url?: string | undefined;
    route?: string | undefined;
    statusCode?: number | undefined;
    durationMs?: number | undefined;
    userId?: number | undefined;
    errorType?: string | undefined;
    [key: string]: unknown;
}

export interface StructuredLogEntry extends LogContext {
    timestamp: string;
    level: LogLevel;
    message: string;
}

const sanitizeContext = (ctx: LogContext): LogContext => {
    const clean: LogContext = {};
    for (const [key, value] of Object.entries(ctx)) {
        if (value === undefined) continue;
        if (/^(password|password_hash|senha|token|secret|authorization)$/i.test(key)) {
            clean[key] = '[REDACTED]';
        } else if (typeof value === 'string') {
            clean[key] = sanitizeForLog(value);
        } else {
            clean[key] = value;
        }
    }
    return clean;
};

export const buildLogEntry = (
    level: LogLevel,
    message: string,
    context: LogContext = {},
): StructuredLogEntry => ({
    timestamp: new Date().toISOString(),
    level,
    message: sanitizeForLog(message),
    ...sanitizeContext(context),
});

const isTestSilent = (): boolean =>
    process.env.LOG_SILENT === 'true' ||
    (Boolean(process.env.VITEST) && process.env.LOG_HTTP_IN_TESTS !== 'true');

export const logger = {
    info: (message: string, context: LogContext = {}): StructuredLogEntry => {
        const entry = buildLogEntry('info', message, context);
        if (!isTestSilent()) {
            console.info(JSON.stringify(entry));
        }
        return entry;
    },

    warn: (message: string, context: LogContext = {}): StructuredLogEntry => {
        const entry = buildLogEntry('warn', message, context);
        if (!isTestSilent()) {
            console.warn(JSON.stringify(entry));
        }
        return entry;
    },

    error: (message: string, context: LogContext = {}): StructuredLogEntry => {
        const entry = buildLogEntry('error', message, context);
        console.error(JSON.stringify(entry));
        return entry;
    },
};
