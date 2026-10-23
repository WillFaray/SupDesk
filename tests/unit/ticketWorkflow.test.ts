import { describe, expect, it } from 'vitest';
import {
    buildTransitionUpdate,
    classifyTransition,
    MIN_RESOLUTION_LENGTH,
} from '../../src/domain/ticketWorkflow.js';

describe('ticketWorkflow (domínio)', () => {
    it('classifica transições de status corretamente', () => {
        expect(classifyTransition('Aberto', 'Em andamento')).toBe('assumido');
        expect(classifyTransition('Aberto', 'Resolvido')).toBe('resolvido');
        expect(classifyTransition('Em andamento', 'Resolvido')).toBe('resolvido');
        expect(classifyTransition('Em andamento', 'Aberto')).toBe('devolvido');
        expect(classifyTransition('Resolvido', 'Em andamento')).toBe('reaberto');
        expect(classifyTransition('Resolvido', 'Aberto')).toBe('reaberto');
    });

    it('retorna null para transição ao mesmo status', () => {
        expect(classifyTransition('Aberto', 'Aberto')).toBeNull();
        expect(classifyTransition('Em andamento', 'Em andamento')).toBeNull();
        expect(classifyTransition('Resolvido', 'Resolvido')).toBeNull();
    });

    it('monta SQL e contagem de parâmetros adequados para cada transição', () => {
        const assumido = buildTransitionUpdate('assumido', 'Em andamento');
        expect(assumido.paramCount).toBe(3);
        expect(assumido.sql).toContain('responsavel_id = $3');
        expect(assumido.sql).toContain('resolvido_em = NULL');

        const resolvido = buildTransitionUpdate('resolvido', 'Resolvido');
        expect(resolvido.paramCount).toBe(4);
        expect(resolvido.sql).toContain('resolvido_em = NOW()');
        expect(resolvido.sql).toContain('resolucao = $4');

        const reabertoParaAberto = buildTransitionUpdate('reaberto', 'Aberto');
        expect(reabertoParaAberto.paramCount).toBe(2);
        expect(reabertoParaAberto.sql).toContain('responsavel_id = NULL');

        const reabertoParaAndamento = buildTransitionUpdate('reaberto', 'Em andamento');
        expect(reabertoParaAndamento.paramCount).toBe(3);
        expect(reabertoParaAndamento.sql).toContain('responsavel_id = $3');

        const devolvido = buildTransitionUpdate('devolvido', 'Aberto');
        expect(devolvido.paramCount).toBe(2);
        expect(devolvido.sql).toContain('responsavel_id = NULL');
    });

    it('mantém MIN_RESOLUTION_LENGTH em 10', () => {
        expect(MIN_RESOLUTION_LENGTH).toBe(10);
    });
});
