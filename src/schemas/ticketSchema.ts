import { z } from "zod";

export const createTicketSchema = z.object({
    title: z.string().min(3, "Título deve ter no mínimo 3 caracteres").max(100, "Título deve ter no máximo 100 caracteres"),
    description: z.string().min(10, "Detalhe melhor o seu problema (mínimo 10 caracteres)").max(1000, "Descrição deve ter no máximo 1000 caracteres"),
    priority: z.enum(["Baixa", "Média", "Alta"], "Prioridade inválida"),
    category: z.enum(["Hardware", "Software", "Rede", "Outros"], "Categoria inválida")
});

export const updateTicketStatusSchema = z.object({
    status: z.enum(["Aberto", "Em andamento", "Resolvido"] as const, {
        message: "Status inválido. Deve ser 'Aberto', 'Em andamento' ou 'Resolvido'"
    })
});

export const createCommentSchema = z.object({
    message: z.string().min(1, "Comentário não pode ser vazio").max(500, "Comentário deve ter no máximo 500 caracteres")
});