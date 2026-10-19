import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const port = process.env.PORT || 3000;

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SupDesk API',
            version: '1.0.0',
            description: 'API do sistema de SupDesk',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Servidor Local',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    required: ['error'],
                    properties: {
                        error: {
                            type: 'string',
                            example: 'Descrição do erro',
                        },
                    },
                },
                ValidationErrorResponse: {
                    type: 'object',
                    required: ['error', 'detalhes'],
                    properties: {
                        error: {
                            type: 'string',
                            example: 'Erro de validação',
                        },
                        detalhes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['campo', 'erro'],
                                properties: {
                                    campo: {
                                        type: 'string',
                                        example: 'email',
                                    },
                                    erro: {
                                        type: 'string',
                                        example: 'Email inválido',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log(`📄 Documentação rodando em http://localhost:${port}/api-docs`);
};
