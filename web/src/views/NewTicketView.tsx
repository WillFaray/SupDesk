import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarChamado } from '../lib/data';
import { corCategoria, corPrioridade, Lamp } from '../components/Lamp';
import { Icon } from '../components/Icon';
import { Spinner } from '../components/Loading';
import { useToast } from '../components/Toast';
import type { Categoria, Prioridade } from '../lib/types';

const PRIORIDADES: Prioridade[] = ['Baixa', 'Média', 'Alta'];
const CATEGORIAS: Categoria[] = ['Hardware', 'Software', 'Rede', 'Outros'];

type CampoErro = { titulo?: string; descricao?: string };

function validarFormulario(titulo: string, descricao: string): CampoErro {
  const e: CampoErro = {};
  if (!titulo.trim()) e.titulo = 'Título é obrigatório.';
  if (descricao.trim().length < 10) e.descricao = 'Descrição deve ter ao menos 10 caracteres.';
  return e;
}

export function NewTicketView() {
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Prioridade>('Média');
  const [category, setCategory] = useState<Categoria>('Outros');
  const [erro, setErro] = useState<string | null>(null);
  const [camposErro, setCamposErro] = useState<CampoErro>({});
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [enviando, setEnviando] = useState(false);

  function tocar(campo: string) {
    setTocados((p) => ({ ...p, [campo]: true }));
  }

  function aoBlur(campo: string) {
    tocar(campo);
    setCamposErro(validarFormulario(title, description));
  }

  function aoDigitarTitulo(val: string) {
    setTitle(val);
    setErro(null);
    if (tocados.titulo) setCamposErro(validarFormulario(val, description));
  }

  function aoDigitarDescricao(val: string) {
    setDescription(val);
    setErro(null);
    if (tocados.descricao) setCamposErro(validarFormulario(title, val));
  }

  async function onSubmit() {
    setErro(null);
    setTocados({ titulo: true, descricao: true });
    const erros = validarFormulario(title, description);
    setCamposErro(erros);
    if (erros.titulo || erros.descricao) return;

    setEnviando(true);
    try {
      const c = await criarChamado({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
      });
      toast.sucesso(`Chamado #${c.id} aberto.`);
      navigate(`/chamados/${c.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao abrir chamado');
      toast.erro('Não foi possível abrir o chamado.');
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
              className={'field__input' + (tocados.titulo && camposErro.titulo ? ' field__input--erro' : '')}
              value={title}
              onChange={(e) => aoDigitarTitulo(e.target.value)}
              onBlur={() => aoBlur('titulo')}
              maxLength={100}
              placeholder="Resumo do problema em uma linha"
              aria-invalid={!!(tocados.titulo && camposErro.titulo)}
              aria-describedby={tocados.titulo && camposErro.titulo ? 'titulo-erro' : undefined}
            />
            {tocados.titulo && camposErro.titulo && (
              <p className="field__error field__error--inline" id="titulo-erro" role="alert">
                <Icon name="alert" size={13} /> {camposErro.titulo}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="n_desc">Descrição <span>*</span></label>
            <textarea
              id="n_desc"
              className={'field__textarea' + (tocados.descricao && camposErro.descricao ? ' field__textarea--erro' : '')}
              value={description}
              onChange={(e) => aoDigitarDescricao(e.target.value)}
              onBlur={() => aoBlur('descricao')}
              maxLength={1000}
              placeholder="O que aconteceu, quando começou, o que você já tentou…"
              aria-invalid={!!(tocados.descricao && camposErro.descricao)}
              aria-describedby={tocados.descricao && camposErro.descricao ? 'descricao-erro' : undefined}
            />
            <span className="field__hint u-mono">{description.length}/1000</span>
            {tocados.descricao && camposErro.descricao && (
              <p className="field__error field__error--inline" id="descricao-erro" role="alert">
                <Icon name="alert" size={13} /> {camposErro.descricao}
              </p>
            )}
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
            <p className="field__error field__error--form" role="alert">
              <Icon name="alert" size={14} /> {erro}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn" onClick={() => navigate('/chamados')}>Cancelar</button>
            <button className="btn btn--primario" disabled={enviando} onClick={onSubmit}>
              {enviando ? <Spinner size={15} /> : <Icon name="send" size={15} />} {enviando ? 'Abrindo…' : 'Abrir chamado'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}