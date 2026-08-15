import express from "express";
import * as z from "zod";

export const validate = (schema: z.ZodSchema) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorMessages = error.issues.map((err) => ({
                    campo: err.path[0],
                    erro: err.message
                }));

                return res.status(400).json({
                    error: "Erro de validação",
                    detalhes: errorMessages
                });
            }
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    };
};
