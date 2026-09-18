// Normaliza as variáveis de ambiente para a suíte de testes.
//
// - O .env (se existir) fornece as credenciais locais do PostgreSQL — dotenv
//   nunca sobrescreve variáveis já definidas no processo/CI.
// - O nome do banco é FORÇADO para `supdesk_test`: os testes nunca tocam no
//   banco de desenvolvimento, mesmo que o .env aponte para ele.
// - JWT_SECRET precisa existir (a aplicação assina/verifica tokens com ele).
import 'dotenv/config';

/**
 * Nome do banco usado pela suíte. O padrão (`supdesk_test`) é isolado do banco
 * de desenvolvimento, mas duas execuções simultâneas do backend ainda
 * disputariam as mesmas tabelas (cada caso trunca). Defina `DB_TEST_NAME` para
 * rodar suítes em paralelo sem interferência.
 */
export const NOME_BANCO_TESTE = process.env.DB_TEST_NAME ?? 'supdesk_test';

export function configurarEnvDeTeste(): void {
    process.env.NODE_ENV ??= 'test';
    process.env.DB_NAME = NOME_BANCO_TESTE;
    process.env.DB_USER ??= 'postgres';
    process.env.DB_HOST ??= 'localhost';
    process.env.DB_PASSWORD ??= '';
    process.env.DB_PORT ??= '5432';
    if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = 'segredo-de-teste-do-supdesk';
    }
}
