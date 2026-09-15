import rateLimit from 'express-rate-limit';

// Rate limiter para login - muito restritivo para prevenir brute force
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo de 5 tentativas
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    standardHeaders: true, // Retorna info em `RateLimit-*` headers
    legacyHeaders: false, // Desabilita `X-RateLimit-*` headers
    keyGenerator: (req, _res) => {
        // Usa o email como chave para limitar por usuário
        return req.body?.email || req.ip;
    },
});

// Rate limiter para registro de usuários
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Máximo de 3 registros por IP
    message: 'Muitos registros criados. Tente novamente em 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter geral para API - menos restritivo
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP
    message: 'Muitas requisições. Tente novamente mais tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});
