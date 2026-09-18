// ThreadComentarios: validação do campo, envio otimista com reload da thread
// e reversão do comentário quando a API falha.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreadComentarios } from './ThreadComentarios';
import { ToastProvider } from './Toast';
import { comentarChamado } from '../lib/data';
import type { Comentario } from '../lib/types';

vi.mock('../lib/data', () => ({ comentarChamado: vi.fn() }));

const anterior: Comentario = {
  id: 10,
  message: 'Já reiniciei o roteador.',
  created_at: '2026-06-01T09:00:00Z',
  autor_do_comentario: 'joao.silva',
  perfil_do_autor: 'usuario',
};

function renderThread(comentarios: Comentario[] = [anterior]) {
  const aoEnviar = vi.fn(async () => {});
  render(
    <ToastProvider>
      <ThreadComentarios id={7} comentarios={comentarios} aoEnviar={aoEnviar} />
    </ToastProvider>,
  );
  return { aoEnviar, usuario: userEvent.setup() };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ThreadComentarios', () => {
  it('lista a thread recebida com autor, perfil e contador', () => {
    renderThread();

    expect(screen.getByText('Registro de interações · 1')).toBeInTheDocument();
    expect(screen.getByText('Já reiniciei o roteador.')).toBeInTheDocument();
    expect(screen.getByText('joao.silva')).toBeInTheDocument();
    expect(screen.getByText('usuario')).toBeInTheDocument();
  });

  it('mantém o botão desabilitado sem mensagem útil', async () => {
    const { usuario } = renderThread();

    expect(screen.getByRole('button', { name: /Registrar/ })).toBeDisabled();

    await usuario.type(screen.getByLabelText('Nova mensagem no chamado'), '   ');
    expect(screen.getByRole('button', { name: /Registrar/ })).toBeDisabled();
  });

  it('acusa campo vazio ao sair do textarea sem escrever', async () => {
    const { usuario } = renderThread();
    const campo = screen.getByLabelText('Nova mensagem no chamado');

    await usuario.click(campo);
    await usuario.tab();

    expect(screen.getByText('O comentário não pode estar vazio.')).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
  });

  it('registra o comentário, confirma no toast e recarrega a thread', async () => {
    vi.mocked(comentarChamado).mockResolvedValue({ ...anterior, id: 11 });
    const { aoEnviar, usuario } = renderThread();

    await usuario.type(screen.getByLabelText('Nova mensagem no chamado'), 'Chamado escalado.');
    await usuario.click(screen.getByRole('button', { name: /Registrar/ }));

    await waitFor(() => expect(comentarChamado).toHaveBeenCalledWith(7, 'Chamado escalado.'));
    expect(await screen.findByText('Comentário registrado.')).toBeInTheDocument();
    // Otimista: aparece na thread antes mesmo de o servidor devolver a lista.
    expect(screen.getByText('Chamado escalado.')).toBeInTheDocument();
    expect(screen.getByText('você')).toBeInTheDocument();
    await waitFor(() => expect(aoEnviar).toHaveBeenCalledOnce());
  });

  it('bloqueia o botão e mostra "Enviando…" enquanto a requisição está em curso', async () => {
    // Promessa que nunca resolve: mantém o componente no estado em vôo.
    vi.mocked(comentarChamado).mockImplementation(() => new Promise(() => {}));
    const { usuario } = renderThread();

    await usuario.type(screen.getByLabelText('Nova mensagem no chamado'), 'Aguarde');
    await usuario.click(screen.getByRole('button', { name: /Registrar/ }));

    const botao = await screen.findByRole('button', { name: /Enviando/ });
    expect(botao).toBeDisabled();
  });

  it('reverte o comentário otimista e avisa quando a API falha', async () => {
    vi.mocked(comentarChamado).mockRejectedValue(new Error('500'));
    const { aoEnviar, usuario } = renderThread();

    await usuario.type(screen.getByLabelText('Nova mensagem no chamado'), 'Vai falhar');
    await usuario.click(screen.getByRole('button', { name: /Registrar/ }));

    expect(
      await screen.findByText('Não foi possível registrar o comentário. Tente novamente.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Não foi possível registrar o comentário.')).toBeInTheDocument();
    expect(screen.queryByText('Vai falhar')).not.toBeInTheDocument();
    expect(aoEnviar).not.toHaveBeenCalled();
  });
});
