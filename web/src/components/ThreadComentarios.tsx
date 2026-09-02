import { useState } from 'react';
import { comentarChamado } from '../lib/data';
import { Icon } from './Icon';
import { Spinner } from './Loading';
import { useToast } from './Toast';
import { txHora } from '../lib/types';
import type { Comentario } from '../lib/types';

export function ThreadComentarios({
  id, comentarios, aoEnviar,
}: {
  id: number;
  comentarios: Comentario[];
  aoEnviar: () => Promise<void>;
}) {
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  async function enviar() {
    if (!msg.trim()) return;
    setEnviando(true);
    try {
      await comentarChamado(id, msg.trim());
      setMsg('');
      await aoEnviar();
      toast.sucesso('Comentário registrado.');
    } catch {
      toast.erro('Não foi possível registrar o comentário.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="instrument" aria-label="Comentários">
      <div className="instrument__head">
        <span className="instrument__title">
          <Icon name="chat" size={13} /> Registro de interações · {comentarios.length}
        </span>
      </div>
      <div className="instrument__body">
        <div className="thread">
          {comentarios.map((cm) => (
            <article className="thread__item" key={cm.id}>
              <div className="thread__head">
                <span className="thread__name">{cm.autor_do_comentario}</span>
                <span className="thread__role">{cm.perfil_do_autor}</span>
                <span className="thread__time">{txHora(cm.created_at)}</span>
              </div>
              <p className="thread__body">{cm.message}</p>
            </article>
          ))}

          <div>
            <textarea
              className="field__textarea"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Escreva uma atualização para este chamado…"
              aria-label="Nova mensagem no chamado"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn" disabled={!msg.trim() || enviando} onClick={enviar}>
                {enviando ? <Spinner size={14} /> : <Icon name="send" size={14} />} {enviando ? 'Enviando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}