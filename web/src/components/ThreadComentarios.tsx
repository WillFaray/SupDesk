import { useEffect, useMemo, useState } from 'react';
import { comentarChamado } from '../lib/data';
import { Icon } from './Icon';
import { Spinner } from './Loading';
import { useToast } from './Toast';
import { txHora } from '../lib/types';
import type { Comentario, EventoChamado, Role } from '../lib/types';

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
  } catch {
    // fallback quando localStorage estiver vazio ou inválido
  }
  return { username: 'você', role: 'usuario' };
}

type ItemTimeline =
  | { tipo: 'comentario'; id: string | number; data: string; comentario: Comentario }
  | { tipo: 'evento'; id: string | number; data: string; evento: EventoChamado };

export function ThreadComentarios({
  id,
  comentarios,
  historico = [],
  aoEnviar,
}: {
  id: number;
  comentarios: Comentario[];
  historico?: EventoChamado[];
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

  const timelineItens: ItemTimeline[] = useMemo(() => {
    const lista: ItemTimeline[] = [];
    for (const cm of comentariosExibidos) {
      lista.push({
        tipo: 'comentario',
        id: `c-${cm.id}`,
        data: cm.created_at,
        comentario: cm,
      });
    }
    for (const ev of historico) {
      lista.push({
        tipo: 'evento',
        id: `e-${ev.id}`,
        data: ev.created_at,
        evento: ev,
      });
    }
    return lista.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [comentariosExibidos, historico]);

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
    if (erros.msg) {
      setCamposErro(erros);
      return;
    }

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

  function iconeEvento(tipo: EventoChamado['tipo']) {
    switch (tipo) {
      case 'criado':
        return 'plus';
      case 'assumido':
        return 'bolt';
      case 'resolvido':
        return 'check';
      case 'reaberto':
        return 'refresh';
      case 'devolvido':
      default:
        return 'arrowLeft';
    }
  }

  function textoEvento(ev: EventoChamado) {
    switch (ev.tipo) {
      case 'criado':
        return 'Chamado aberto';
      case 'assumido':
        return 'Atendimento iniciado';
      case 'resolvido':
        return 'Chamado concluído e resolvido';
      case 'reaberto':
        return 'Chamado reaberto';
      case 'devolvido':
      default:
        return 'Chamado devolvido para triagem';
    }
  }

  return (
    <section className="instrument" aria-label="Comentários e histórico">
      <div className="instrument__head">
        <span className="instrument__title">
          <Icon name="chat" size={13} /> Registro de interações · {comentarios.length}
        </span>
        {historico.length > 0 && (
          <span className="thread__historico-badge">
            <Icon name="clock" size={11} /> {historico.length}{' '}
            {historico.length === 1 ? 'marco' : 'marcos'} de fluxo
          </span>
        )}
      </div>
      <div className="instrument__body">
        <div className="thread">
          {timelineItens.map((item) => {
            if (item.tipo === 'evento') {
              const ev = item.evento;
              return (
                <div
                  key={item.id}
                  className={`thread__event thread__event--${ev.tipo}`}
                  role="group"
                  aria-label={textoEvento(ev)}
                >
                  <div className="thread__event-indicator">
                    <Icon name={iconeEvento(ev.tipo)} size={12} />
                  </div>
                  <div className="thread__event-content">
                    <div className="thread__event-head">
                      <span className="thread__event-title">{textoEvento(ev)}</span>
                      {ev.autor && (
                        <span className="thread__event-author">
                          por <strong>{ev.autor}</strong>
                          {ev.perfil_do_autor && (
                            <span className="thread__role" style={{ marginLeft: 6 }}>
                              {ev.perfil_do_autor}
                            </span>
                          )}
                        </span>
                      )}
                      <span className="thread__time">{txHora(ev.created_at)}</span>
                    </div>
                    {ev.detalhe && (
                      <blockquote className="thread__event-justificativa">
                        <strong>Justificativa:</strong> {ev.detalhe}
                      </blockquote>
                    )}
                  </div>
                </div>
              );
            }

            const cm = item.comentario;
            return (
              <article className="thread__item" key={item.id}>
                <div className="thread__head">
                  <span className="thread__name">{cm.autor_do_comentario}</span>
                  <span className="thread__role">{cm.perfil_do_autor}</span>
                  <span className="thread__time">{txHora(cm.created_at)}</span>
                </div>
                <p className="thread__body">{cm.message}</p>
              </article>
            );
          })}

          {erroOtimista && (
            <p
              className="field__error field__error--form"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              <Icon name="alert" size={14} /> {erroOtimista}
            </p>
          )}

          <div style={{ marginTop: 8 }}>
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
