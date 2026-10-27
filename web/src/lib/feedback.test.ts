import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { nomeAmigavelCampo, traduzirErro } from './feedback';

describe('feedback - nomeAmigavelCampo', () => {
  it('traduz nomes de campos conhecidos', () => {
    expect(nomeAmigavelCampo('title')).toBe('Título');
    expect(nomeAmigavelCampo('description')).toBe('Descrição');
    expect(nomeAmigavelCampo('resolucao')).toBe('Justificativa da resolução');
  });

  it('retorna o próprio nome para campos desconhecidos', () => {
    expect(nomeAmigavelCampo('outro_campo')).toBe('outro_campo');
  });
});

describe('feedback - traduzirErro', () => {
  it('traduz status 0 para falha de conexão', () => {
    const res = traduzirErro(new ApiError('Sem conexão', 0));
    expect(res.titulo).toBe('Sem conexão com o servidor');
    expect(res.podeTentarNovamente).toBe(true);
  });

  it('traduz status 400 com detalhes de validação', () => {
    const res = traduzirErro(
      new ApiError('Erro de validação', 400, [
        { campo: 'title', erro: 'mínimo 3 caracteres' },
        { campo: 'description', erro: 'mínimo 10 caracteres' },
      ]),
    );
    expect(res.titulo).toBe('Dados inconsistentes');
    expect(res.detalhes).toEqual([
      'Título: mínimo 3 caracteres',
      'Descrição: mínimo 10 caracteres',
    ]);
    expect(res.campos?.title).toBe('mínimo 3 caracteres');
  });

  it('traduz status 401 para sessão expirada', () => {
    const res = traduzirErro(new ApiError('Não autorizado', 401));
    expect(res.titulo).toBe('Sessão expirada');
    expect(res.podeTentarNovamente).toBe(false);
  });

  it('traduz status 403 para acesso restrito', () => {
    const res = traduzirErro(new ApiError('Acesso negado', 403));
    expect(res.titulo).toBe('Acesso restrito');
    expect(res.podeTentarNovamente).toBe(false);
  });

  it('traduz status 404 para recurso não encontrado', () => {
    const res = traduzirErro(new ApiError('Não encontrado', 404));
    expect(res.titulo).toBe('Recurso não encontrado');
  });

  it('traduz status 409 para conflito de concorrência', () => {
    const res = traduzirErro(new ApiError('Chamado já assumido por outro analista', 409));
    expect(res.titulo).toBe('Conflito de concorrência');
    expect(res.mensagem).toContain('já assumido');
  });

  it('traduz status 500 para instabilidade temporária', () => {
    const res = traduzirErro(new ApiError('Internal Error', 500));
    expect(res.titulo).toBe('Instabilidade no servidor');
  });

  it('trata erros genéricos de Error e strings', () => {
    expect(traduzirErro(new Error('Falha customizada')).mensagem).toBe('Falha customizada');
    expect(traduzirErro('Mensagem em texto').mensagem).toBe('Mensagem em texto');
    expect(traduzirErro(null).titulo).toBe('Erro inesperado');
  });
});
