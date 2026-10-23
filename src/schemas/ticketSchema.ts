import { z } from 'zod';
import { MIN_RESOLUTION_LENGTH } from '../domain/ticketWorkflow.js';

const sanitizeText = (val: string): string => val.replace(/\0/g, '').trim();

export const createTicketSchema = z.object({
    title: z
        .string()
        .transform(sanitizeText)
        .pipe(
            z
                .string()
                .min(3, 'Título deve ter no mínimo 3 caracteres')
                .max(100, 'Título deve ter no máximo 100 caracteres'),
        ),
    description: z
        .string()
        .transform(sanitizeText)
        .pipe(
            z
                .string()
                .min(10, 'Detalhe melhor o seu problema (mínimo 10 caracteres)')
                .max(1000, 'Descrição deve ter no máximo 1000 caracteres'),
        ),
    priority: z.enum(['Baixa', 'Média', 'Alta'], 'Prioridade inválida'),
    category: z.enum(['Hardware', 'Software', 'Rede', 'Outros'], 'Categoria inválida'),
});

const optionalText = (max: number, maxMessage: string) =>
    z.string().transform(sanitizeText).pipe(z.string().max(max, maxMessage)).optional();

export const updateTicketStatusSchema = z
    .object({
        status: z.enum(['Aberto', 'Em andamento', 'Resolvido'] as const, {
            message: "Status inválido. Deve ser 'Aberto', 'Em andamento' ou 'Resolvido'",
        }),
        /** Justificativa obrigatória ao marcar como Resolvido. */
        resolucao: optionalText(1000, 'Justificativa deve ter no máximo 1000 caracteres'),
        /** Motivo opcional ao reabrir ou devolver o chamado à fila. */
        motivo: optionalText(500, 'Motivo deve ter no máximo 500 caracteres'),
    })
    .superRefine((data, ctx) => {
        if (data.status === 'Resolvido' && (data.resolucao ?? '').length < MIN_RESOLUTION_LENGTH) {
            ctx.addIssue({
                code: 'custom',
                path: ['resolucao'],
                message: `Informe a justificativa da resolução (mínimo ${MIN_RESOLUTION_LENGTH} caracteres)`,
            });
        }
    });

export const createCommentSchema = z.object({
    message: z
        .string()
        .transform(sanitizeText)
        .pipe(
            z
                .string()
                .min(1, 'Comentário não pode ser vazio')
                .max(500, 'Comentário deve ter no máximo 500 caracteres'),
        ),
});

export type CreateTicketDTO = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusDTO = z.infer<typeof updateTicketStatusSchema>;
export type CreateCommentDTO = z.infer<typeof createCommentSchema>;
