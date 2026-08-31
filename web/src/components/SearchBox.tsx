import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Icon } from './Icon';

export function SearchBox() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const v = q.trim();
    if (!v) return;
    const num = /^\d+$/.test(v);
    navigate(num ? `/chamados/${v}` : `/chamados?q=${encodeURIComponent(v)}`);
    setQ('');
  }

  return (
    <div className="search-box" role="search">
      <Icon name="search" size={14} />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Buscar chamado / nº…"
        aria-label="Buscar chamado por número ou texto"
      />
    </div>
  );
}