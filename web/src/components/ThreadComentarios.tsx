import { useState } from 'react';
import { comentarChamado } from '../lib/data';
import { Icon } from './Icon';
import { Spinner } from './Loading';
import { useToast } from './Toast';
import { txHora } from '../lib/types';
import type { Comentario } from '../lib/types';

type CampoErro = { msg?: string };

function validarComentario(msg: string): CampoErro {
  const e: CampoErro = {};
  if (!msg.trim()) e.msg = 'O comentário não pode estar vazio.';
  return e;
}

export function ThreadComentarios({
  id, comentarios, aoEnviar,
}: {
  id: number;
  comentarios: Comentario[];
  aoEnviar: () => Promise<void>;
}) {
  const [msg, setMsg] = useState('');
  // const [erro, setErro] = useState<string | null>(null); // Unused state removed
  const [camposErro, setCamposErro] = useState<CampoErro>({});
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  function aoBlur() {
    setTocado(true);
    setCamposErro(validarComentario(msg));
  }

  function aoDigitar(val: string) {
    setMsg(val);
    // setErro(null); // removed unused state
    if (tocado) setCamposErro(validarComentario(val));
  }

  async function enviar() {
    // setErro(null); // removed unused state
    setTocado(true);
    const erros = validarComentario(msg);
    setCamposErro(erros);
    if (erros.msg) return;

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
              className={'field__textarea' + (tocado && camposErro.msg ? ' field__textarea--erro' : '')}
              value={msg}
              onChange={(e) => aoDigitar(e.target.value)}
              onBlur={() => aoBlur()}
              placeholder="Escreva uma atualização para este chamado…"
              aria-label="Nova mensagem no chamado"
              aria-invalid={!!(tocado && camposErro.msg)}
              aria-describedby={tocado && camposErro.msg ? 'msg-erro' : undefined}
            />
            {tocado && camposErro.msg && (
              <p className="field__error field__error--inline" id="msg-erro" role="alert">
                <Icon name="alert" size={13} /> {camposErro.msg}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn" disabled={!(msg.trim() && !camposErro.msg) || enviando} onClick={enviar}>
                {enviando ? <Spinner size={14} /> : <Icon name="send" size={14} />} {enviando ? 'Enviando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}