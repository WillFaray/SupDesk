import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';

interface ModalResolucaoProps {
  aberto: boolean;
  chamadoId: number;
  aoFechar: () => void;
  aoConfirmar: (resolucao: string) => Promise<void>;
}

export function ModalResolucao({ aberto, chamadoId, aoFechar, aoConfirmar }: ModalResolucaoProps) {
  const [resolucao, setResolucao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    if (aberto) {
      setResolucao('');
      setErro(null);
      setTocado(false);
      setCarregando(false);
    }
  }, [aberto]);

  function validar(texto: string): string | null {
    const limpo = texto.trim();
    if (!limpo) return 'A justificativa da resolução é obrigatória.';
    if (limpo.length < 10) return 'Informe uma justificativa com no mínimo 10 caracteres.';
    if (limpo.length > 1000) return 'A justificativa deve ter no máximo 1000 caracteres.';
    return null;
  }

  function aoDigitar(val: string) {
    setResolucao(val);
    if (tocado) {
      setErro(validar(val));
    }
  }

  function aoBlur() {
    setTocado(true);
    setErro(validar(resolucao));
  }

  async function confirmar() {
    setTocado(true);
    const msgErro = validar(resolucao);
    if (msgErro) {
      setErro(msgErro);
      return;
    }

    setCarregando(true);
    try {
      await aoConfirmar(resolucao.trim());
      aoFechar();
    } catch {
      setErro('Não foi possível registrar a resolução. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  const tamanho = resolucao.trim().length;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Concluir chamado #${chamadoId}`}
      descricao="Descreva a ação técnica realizada e a solução aplicada para resolver este chamado."
      acaoPrimaria={{
        label: 'Confirmar resolução',
        variante: 'primaria',
        carregando,
        onClick: confirmar,
      }}
      acaoSecundaria={{
        label: 'Cancelar',
        onClick: aoFechar,
      }}
    >
      <div style={{ marginTop: 12 }}>
        <label
          htmlFor="justificativa-resolucao"
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ink-strong)',
            marginBottom: 6,
          }}
        >
          Justificativa da resolução <span style={{ color: 'var(--lamp-vermelha)' }}>*</span>
        </label>
        <textarea
          id="justificativa-resolucao"
          className={'field__textarea' + (erro ? ' field__textarea--erro' : '')}
          value={resolucao}
          onChange={(e) => aoDigitar(e.target.value)}
          onBlur={aoBlur}
          placeholder="Ex.: Configuração de rede redefinida e teste de conexão bem-sucedido com o usuário..."
          rows={4}
          aria-invalid={!!erro}
          aria-describedby={erro ? 'erro-resolucao' : 'contador-resolucao'}
          disabled={carregando}
          autoFocus
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
            fontSize: 11,
          }}
        >
          {erro ? (
            <p
              className="field__error field__error--inline"
              id="erro-resolucao"
              role="alert"
              style={{ margin: 0 }}
            >
              <Icon name="alert" size={12} /> {erro}
            </p>
          ) : (
            <span style={{ color: 'var(--ink-muted)' }}>Mínimo 10 caracteres</span>
          )}
          <span
            id="contador-resolucao"
            style={{
              fontFamily: 'var(--font-mono)',
              color: tamanho > 1000 ? 'var(--lamp-vermelha)' : 'var(--ink-muted)',
            }}
          >
            {tamanho}/1000
          </span>
        </div>
      </div>
    </Modal>
  );
}
