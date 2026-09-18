import crypto from 'node:crypto';
import pool from './database.js';

/** SHA-256 do token — o valor guardado em `revoked_tokens` (nunca o token em claro). */
export const hashToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

export const revokeToken = async (token: string, expiresAtSeconds: number): Promise<void> => {
    await pool.query('DELETE FROM revoked_tokens WHERE expires_at < NOW()');
    await pool.query(
        'INSERT INTO revoked_tokens (token_hash, expires_at) VALUES ($1, to_timestamp($2))',
        [hashToken(token), expiresAtSeconds],
    );
};
