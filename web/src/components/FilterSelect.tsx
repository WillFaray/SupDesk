import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

interface FilterSelectProps<T extends string> {
  label: string;
  opcoes: { valor: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
}

/** Dropdown de filtro no tema do app (substitui o select nativo da filterbar). */
export function FilterSelect<T extends string>({
  label,
  opcoes,
  valor,
  onChange,
}: FilterSelectProps<T>) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const atual = opcoes.find((o) => o.valor === valor);

  return (
    <div className="fselect" ref={ref}>
      <button
        type="button"
        className={`fselect__btn${valor !== opcoes[0]?.valor ? ' is-set' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={label}
        onClick={() => setAberto((a) => !a)}
      >
        {atual?.label ?? label}
        <Icon name={aberto ? 'up' : 'down'} size={13} />
      </button>

      {aberto && (
        <ul className="fselect__pop" role="listbox" aria-label={label}>
          {opcoes.map((o) => (
            <li key={o.valor}>
              <button
                type="button"
                className="fselect__opt"
                role="option"
                aria-selected={o.valor === valor}
                onClick={() => {
                  onChange(o.valor);
                  setAberto(false);
                }}
              >
                <span>{o.label}</span>
                {o.valor === valor && <Icon name="check" size={13} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
