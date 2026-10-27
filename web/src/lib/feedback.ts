import { ApiError } from './api';

export interface ErroFormatado {
  titulo: string;
  mensagem: string;
  detalhes?: string[];
  campos?: Record<string, string>;
  podeTentarNovamente: boolean;
}

/**
 * Mapeia nomes técnicos de campos da API para nomes amigáveis em português.
 */
const NOMES_CAMPOS: Record<string, string> = {
  title: 'Título',
  description: 'Descrição',
  priority: 'Prioridade',
  category: 'Categoria',
  status: 'Status',
  resolucao: 'Justificativa da resolução',
  motivo: 'Motivo',
  email: 'E-mail',
  password: 'Senha',
  username: 'Nome de usuário',
};

export function nomeAmigavelCampo(campo: string): string {
  return NOMES_CAMPOS[campo] || campo;
}

/**
 * Traduz erros técnicos de rede, status HTTP e validação Zod/PostgreSQL
 * para mensagens claras, empáticas e acionáveis pelo usuário.
 */
export function traduzirErro(erro: unknown): ErroFormatado {
  if (erro instanceof ApiError) {
    const campos: Record<string, string> = {};
    const detalhesTexto: string[] = [];

    if (erro.detalhes && erro.detalhes.length > 0) {
      for (const item of erro.detalhes) {
        const campoFormatado = item.campo ? nomeAmigavelCampo(item.campo) : '';
        if (item.campo) {
          campos[item.campo] = item.erro;
        }
        detalhesTexto.push(campoFormatado ? `${campoFormatado}: ${item.erro}` : item.erro);
      }
    }

    switch (erro.status) {
      case 0:
        return {
          titulo: 'Sem conexão com o servidor',
          mensagem:
            'Não foi possível estabelecer contato com a API. Verifique sua conexão com a rede ou use o modo demonstração.',
          podeTentarNovamente: true,
        };
      case 400:
        return {
          titulo: 'Dados inconsistentes',
          mensagem:
            detalhesTexto.length > 0
              ? `Verifique os campos destacados: ${detalhesTexto.join(', ')}.`
              : erro.message && erro.message !== 'Erro 400'
                ? erro.message
                : 'Os dados enviados contêm inconsistências. Revise o formulário e tente novamente.',
          detalhes: detalhesTexto.length > 0 ? detalhesTexto : undefined,
          campos: Object.keys(campos).length > 0 ? campos : undefined,
          podeTentarNovamente: true,
        };
      case 401:
        return {
          titulo: 'Sessão expirada',
          mensagem:
            'Sua autenticação não é mais válida. Por favor, acerte suas credenciais para continuar.',
          podeTentarNovamente: false,
        };
      case 403:
        return {
          titulo: 'Acesso restrito',
          mensagem:
            'Você não possui permissão para executar esta operação. Entre em contato com um administrador se precisar de acesso.',
          podeTentarNovamente: false,
        };
      case 404:
        return {
          titulo: 'Recurso não encontrado',
          mensagem:
            'O chamado ou informação solicitada não foi encontrada. O registro pode ter sido excluído ou seu usuário não possui acesso a ele.',
          podeTentarNovamente: false,
        };
      case 408:
        return {
          titulo: 'Tempo de resposta esgotado',
          mensagem:
            'O servidor demorou muito para responder. Por favor, tente a operação novamente.',
          podeTentarNovamente: true,
        };
      case 409:
        return {
          titulo: 'Conflito de concorrência',
          mensagem:
            erro.message && erro.message.length > 10
              ? erro.message
              : 'Outro operador atualizou este registro recentemente. Os dados mais recentes foram recarregados.',
          podeTentarNovamente: true,
        };
      case 413:
        return {
          titulo: 'Conteúdo muito extenso',
          mensagem: 'O texto ou arquivo enviado excede o limite máximo permitido pelo sistema.',
          podeTentarNovamente: true,
        };
      case 429:
        return {
          titulo: 'Muitas tentativas',
          mensagem:
            'Muitas requisições em pouco tempo. Aguarde alguns segundos antes de tentar de novo.',
          podeTentarNovamente: true,
        };
      case 500:
      case 502:
      case 503:
        return {
          titulo: 'Instabilidade no servidor',
          mensagem: 'O servidor encontrou uma falha temporária. Tente novamente em instantes.',
          podeTentarNovamente: true,
        };
      default:
        return {
          titulo: 'Falha na operação',
          mensagem: erro.message || `Erro inesperado (${erro.status}). Tente novamente.`,
          podeTentarNovamente: true,
        };
    }
  }

  if (erro instanceof Error) {
    if (erro.name === 'AbortError' || erro.message.toLowerCase().includes('abort')) {
      return {
        titulo: 'Tempo limite excedido',
        mensagem: 'A requisição demorou além do esperado e foi cancelada. Verifique sua conexão.',
        podeTentarNovamente: true,
      };
    }
    return {
      titulo: 'Não foi possível concluir a ação',
      mensagem: erro.message || 'Ocorreu um erro inesperado. Tente novamente.',
      podeTentarNovamente: true,
    };
  }

  if (typeof erro === 'string' && erro.trim()) {
    return {
      titulo: 'Aviso',
      mensagem: erro,
      podeTentarNovamente: true,
    };
  }

  return {
    titulo: 'Erro inesperado',
    mensagem: 'Ocorreu uma falha não identificada. Tente novamente mais tarde.',
    podeTentarNovamente: true,
  };
}
