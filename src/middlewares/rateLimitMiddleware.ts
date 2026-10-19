import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, _res) => {
        const rawEmail = (req.body as { email?: unknown } | undefined)?.email;
        const normalizedEmail =
            typeof rawEmail === 'string' && rawEmail.trim().length > 0
                ? rawEmail.trim().toLowerCase()
                : undefined;
        return normalizedEmail || req.ip || 'unknown';
    },
});

export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Muitos registros criados. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});
