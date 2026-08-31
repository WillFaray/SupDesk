import { z } from "zod";

export const userSchema = z.object({
    username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres").max(20, "Usuário deve ter no máximo 20 caracteres"),
    email: z.string().email("Email inválido"),
    password_hash: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    role: z.enum(["admin", "usuario", "analista"]).optional()
});

export const updateUserSchema = z.object({
    username: z.string().min(3, "Usuário deve ter no mínimo 3 caracteres").max(20, "Usuário deve ter no máximo 20 caracteres").optional(),
    email: z.string().email("Email inválido").optional(),
    password_hash: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: "Pelo menos um campo deve ser fornecido para atualização"
});
