// Resposta "fake" minimalista para testes unitários de middlewares: captura
// status/corpo em arrays simples, sem precisar de mocks com tipos complexos.
import type express from 'express';

export interface ResFalsa {
    res: express.Response;
    statuses: number[];
    corpos: unknown[];
}

export const resFalsa = (): ResFalsa => {
    const statuses: number[] = [];
    const corpos: unknown[] = [];
    const res = {
        status(codigo: number) {
            statuses.push(codigo);
            return this;
        },
        json(corpo: unknown) {
            corpos.push(corpo);
            return this;
        },
    } as unknown as express.Response;
    return { res, statuses, corpos };
};
