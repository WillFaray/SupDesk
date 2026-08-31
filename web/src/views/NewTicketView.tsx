import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarChamado } from '../lib/data';
import { corCategoria, corPrioridade, Lamp } from '../components/Lamp';
import { Icon } from '../components/Icon';
import type { Categoria, Prioridade } from '../lib/types';

const PRIORIDADES: Prioridade[] = ['Baixa', 'Média', 'Alta'];
const CATEGORIAS: Categoria[] = ['Hardware', 'Software', 'Rede', 'Outros'];

export function NewTicketView() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Prioridade>('Média');
  const [category, setCategory] = useState<Categoria>('Outros');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit() {
    if (!title.trim() || description.trim().length < 10) {
      setErro('Dê um título e descreva o problema com ao menos 10 caracteres.');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const c = await criarChamado({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
      });
      navigate(`/chamados/${c.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao abrir chamado');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="detail" style={{ maxWidth: 640 }}>
      <button className="btn btn--fantasma btn--sm" onClick={() => navigate('/chamados')} style={{ marginBottom: 16 }}>
        <Icon name="arrowLeft" size={14} /> Voltar à fila
      </button>

      <div className="page-head">
        <div>
          <h1 className="page-head__title">Novo chamado</h1>
          <p className="page-head__sub">Registro de ocorrência no painel</p>
        </div>
      </div>

      <section className="instrument" aria-label="Formulário de novo chamado">
        <div className="instrument__head">
          <span className="instrument__title"><Icon name="plus" size={13} /> Ocorrência</span>
        </div>
        <div className="instrument__body">
          <div className="field">
            <label className="field__label" htmlFor="n_titulo">Título <span>*</span></label>
            <input
              id="n_titulo"
              className="field__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Resumo do problema em uma linha"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="n_desc">Descrição <span>*</span></label>
            <textarea
              id="n_desc"
              className="field__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              placeholder="O que aconteceu, quando começou, o que você já tentou…"
            />
            <span className="field__hint u-mono">{description.length}/1000</span>
          </div>

          <div className="field">
            <span className="field__label" id="n_prio_lbl">Prioridade</span>
            <div className="pickrow" role="radiogroup" aria-labelledby="n_prio_lbl">
              {PRIORIDADES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="pick"
                  role="radio"
                  aria-checked={priority === p}
                  aria-pressed={priority === p}
                  onClick={() => setPriority(p)}
                >
                  <Lamp cor={corPrioridade[p]} acesa={priority === p} size={8} />
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label" id="n_cat_lbl">Categoria</span>
            <div className="pickrow" role="radiogroup" aria-labelledby="n_cat_lbl">
              {CATEGORIAS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="pick"
                  role="radio"
                  aria-checked={category === c}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  <Lamp cor={corCategoria[c]} acesa={category === c} size={8} />
                  {c}
                </button>
              ))}
            </div>
          </div>

          {erro && (
            <p className="field__error" role="alert">
              <Icon name="alert" size={14} /> {erro}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn" onClick={() => navigate('/chamados')}>Cancelar</button>
            <button className="btn btn--primario" disabled={enviando} onClick={onSubmit}>
              <Icon name="send" size={15} /> {enviando ? 'Abrindo…' : 'Abrir chamado'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}