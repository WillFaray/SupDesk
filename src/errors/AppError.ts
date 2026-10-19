export interface ValidationErrorDetail {
    campo: PropertyKey | undefined;
    erro: string;
}

export interface ErrorResponseBody {
    error: string;
    detalhes?: ValidationErrorDetail[] | undefined;
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly detalhes?: ValidationErrorDetail[] | undefined;

    constructor(statusCode: number, message: string, detalhes?: ValidationErrorDetail[]) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.detalhes = detalhes;
    }

    static badRequest(message: string, detalhes?: ValidationErrorDetail[]): AppError {
        return new AppError(400, message, detalhes);
    }

    static unauthorized(message = 'Token inválido.'): AppError {
        return new AppError(401, message);
    }

    static forbidden(message = 'Acesso negado.'): AppError {
        return new AppError(403, message);
    }

    static notFound(message = 'Recurso não encontrado.'): AppError {
        return new AppError(404, message);
    }

    static conflict(message = 'Registro duplicado.'): AppError {
        return new AppError(409, message);
    }
}
