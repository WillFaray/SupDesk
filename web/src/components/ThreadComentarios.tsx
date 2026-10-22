import { useEffect, useMemo, useState } from 'react';
import { comentarChamado } from '../lib/data';
import { Icon } from './Icon';
import { Spinner } from './Loading';
import { useToast } from './Toast';
import { txHora } from '../lib/types';
import type { Comentario, Role } from '../lib/types';

type CampoErro = { msg?: string };

function validarComentario(msg: string): CampoErro {
  const e: CampoErro = {};
  if (!msg.trim()) e.msg = 'O comentário não pode estar vazio.';
  return e;
}

function autorPadrao(): { username: string; role: Role } {
  try {
    const raw = localStorage.getItem('supdesk_user');
    if (raw) {
      const u = JSON.parse(raw) as { username?: string; role?: Role };
      if (u.username && u.role) return { username: u.username, role: u.role };
    }
  } catch {}
  return { username: 'você', role: 'usuario' };
}

export function ThreadComentarios({
  id,
  comentarios,
  aoEnviar,
}: {
  id: number;
  comentarios: Comentario[];
  aoEnviar: () => Promise<void>;
}) {
  const [msg, setMsg] = useState('');
  const [camposErro, setCamposErro] = useState<CampoErro>({});
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [comentarioOtimista, setComentarioOtimista] = useState<Comentario | null>(null);
  const [erroOtimista, setErroOtimista] = useState<string | null>(null);
  const toast = useToast();

  // Se o comentário oficial já chegou pela prop comentários, limpa o otimista.
  useEffect(() => {
    if (
      comentarioOtimista &&
      comentarios.some(
        (c) =>
          c.id === comentarioOtimista.id || c.message.trim() === comentarioOtimista.message.trim(),
      )
    ) {
      setComentarioOtimista(null);
    }
  }, [comentarios, comentarioOtimista]);

  const comentariosExibidos = useMemo(() => {
    if (!comentarioOtimista) return comentarios;
    const jaExiste = comentarios.some(
      (c) =>
        c.id === comentarioOtimista.id || c.message.trim() === comentarioOtimista.message.trim(),
    );
    if (jaExiste) return comentarios;
    return [...comentarios, comentarioOtimista];
  }, [comentarios, comentarioOtimista]);

  function aoBlur() {
    setTocado(true);
    setCamposErro(validarComentario(msg));
  }

  function aoDigitar(val: string) {
    setMsg(val);
    if (tocado) setCamposErro(validarComentario(val));
  }

  async function enviar() {
    setTocado(true);
    const erros = validarComentario(msg);
    setCamposErro(erros);
    if (erros.msg) return;

    const agora = new Date().toISOString();
    const autor = autorPadrao();
    const otimista: Comentario = {
      id: Date.now(),
      message: msg.trim(),
      created_at: agora,
      autor_do_comentario: autor.username,
      perfil_do_autor: autor.role,
    };
    setComentarioOtimista(otimista);
    setErroOtimista(null);
    setMsg('');
    setEnviando(true);

    try {
      await comentarChamado(id, otimista.message);
      toast.sucesso('Comentário registrado.');
      await aoEnviar();
    } catch {
      setComentarioOtimista(null);
      setErroOtimista('Não foi possível registrar o comentário. Tente novamente.');
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
          {comentariosExibidos.map((cm) => (
            <article className="thread__item" key={cm.id}>
              <div className="thread__head">
                <span className="thread__name">{cm.autor_do_comentario}</span>
                <span className="thread__role">{cm.perfil_do_autor}</span>
                <span className="thread__time">{txHora(cm.created_at)}</span>
              </div>
              <p className="thread__body">{cm.message}</p>
            </article>
          ))}

          {erroOtimista && (
            <p
              className="field__error field__error--form"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              <Icon name="alert" size={14} /> {erroOtimista}
            </p>
          )}

          <div>
            <textarea
              className={
                'field__textarea' + (tocado && camposErro.msg ? ' field__textarea--erro' : '')
              }
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
              <button
                className="btn"
                disabled={!(msg.trim() && !camposErro.msg) || enviando}
                onClick={enviar}
              >
                {enviando ? <Spinner size={14} /> : <Icon name="send" size={14} />}{' '}
                {enviando ? 'Enviando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
