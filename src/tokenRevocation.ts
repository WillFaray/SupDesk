import crypto from 'node:crypto';
import pool from './database.js';

const hashToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

export const revokeToken = async (token: string, expiresAtSeconds: number): Promise<void> => {
    await pool.query('DELETE FROM revoked_tokens WHERE expires_at < NOW()');
    await pool.query(
        'INSERT INTO revoked_tokens (token_hash, expires_at) VALUES ($1, to_timestamp($2))',
        [hashToken(token), expiresAtSeconds],
    );
};

export const isTokenRevoked = async (token: string): Promise<boolean> => {
    type RevocationRow = { revoked: boolean };
    const result = await pool.query<RevocationRow>(
        'SELECT EXISTS (SELECT 1 FROM revoked_tokens WHERE token_hash = $1 AND expires_at > NOW()) AS revoked',
        [hashToken(token)],
    );
    return result.rows[0]?.revoked === true;
};
