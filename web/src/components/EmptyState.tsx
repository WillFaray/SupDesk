import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icone?: string;
  variante?: 'primaria' | 'padrao' | 'perigo';
}

export interface EmptyStateProps {
  icone?: string;
  titulo: string;
  descricao?: ReactNode;
  dica?: string;
  acaoPrimaria?: EmptyStateAction;
  acaoSecundaria?: EmptyStateAction;
  variante?: 'padrao' | 'busca' | 'erro' | 'sucesso' | 'aviso';
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icone = 'inbox',
  titulo,
  descricao,
  dica,
  acaoPrimaria,
  acaoSecundaria,
  variante = 'padrao',
  className = '',
  children,
}: EmptyStateProps) {
  const isAlert = variante === 'erro';

  return (
    <div
      className={`empty-state empty-state--${variante}${className ? ` ${className}` : ''}`}
      role={isAlert ? 'alert' : 'region'}
      aria-label={titulo}
    >
      <div className="empty-state__icon-wrap" aria-hidden="true">
        <Icon name={icone} size={28} />
      </div>

      <h3 className="empty-state__title">{titulo}</h3>

      {descricao && <div className="empty-state__desc">{descricao}</div>}

      {dica && (
        <div className="empty-state__tip">
          <Icon name="info" size={13} />
          <span>{dica}</span>
        </div>
      )}

      {children}

      {(acaoPrimaria || acaoSecundaria) && (
        <div className="empty-state__actions">
          {acaoPrimaria && (
            <button
              type="button"
              className={`btn btn--sm ${
                acaoPrimaria.variante === 'primaria'
                  ? 'btn--primario'
                  : acaoPrimaria.variante === 'perigo'
                    ? 'btn--perigo'
                    : ''
              }`}
              onClick={acaoPrimaria.onClick}
            >
              {acaoPrimaria.icone && <Icon name={acaoPrimaria.icone} size={14} />}
              {acaoPrimaria.label}
            </button>
          )}

          {acaoSecundaria && (
            <button
              type="button"
              className={`btn btn--fantasma btn--sm ${
                acaoSecundaria.variante === 'perigo' ? 'btn--perigo' : ''
              }`}
              onClick={acaoSecundaria.onClick}
            >
              {acaoSecundaria.icone && <Icon name={acaoSecundaria.icone} size={14} />}
              {acaoSecundaria.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
