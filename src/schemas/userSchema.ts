import { z } from 'zod';

const stripNullBytes = (val: string): string => val.replace(/\0/g, '');

const usernameField = z
    .string()
    .transform((val) => stripNullBytes(val).trim())
    .pipe(
        z
            .string()
            .min(3, 'Usuário deve ter no mínimo 3 caracteres')
            .max(20, 'Usuário deve ter no máximo 20 caracteres'),
    );

const emailField = z
    .string()
    .transform((val) => stripNullBytes(val).trim().toLowerCase())
    .pipe(z.string().max(100, 'Email deve ter no máximo 100 caracteres').email('Email inválido'));

const passwordField = z
    .string()
    .refine((val) => !val.includes('\0'), 'Senha contém caracteres inválidos')
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(72, 'Senha deve ter no máximo 72 caracteres');

export const registerSchema = z.object({
    username: usernameField,
    email: emailField,
    password_hash: passwordField,
});

export const loginSchema = z.object({
    email: emailField,
    password: z
        .string()
        .refine((val) => !val.includes('\0'), 'Senha contém caracteres inválidos')
        .min(1, 'Senha é obrigatória')
        .max(128, 'Senha excede o limite permitido'),
});

export const updateUserSchema = z
    .object({
        username: usernameField.optional(),
        email: emailField.optional(),
        password_hash: passwordField.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Pelo menos um campo deve ser fornecido para atualização',
    });

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
