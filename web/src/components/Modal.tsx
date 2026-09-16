import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children?: ReactNode;
  acaoPrimaria?: {
    label: string;
    onClick: () => void;
    variante?: 'primaria' | 'perigosa';
    carregando?: boolean;
  };
  acaoSecundaria?: {
    label: string;
    onClick: () => void;
  };
}

export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  acaoPrimaria,
  acaoSecundaria,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  function aoCliqueOverlay(e: React.MouseEvent) {
    if (e.target === overlayRef.current) {
      aoFechar();
    }
  }

  useEffect(() => {
    function aoTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && aberto) {
        aoFechar();
      }
    }
    if (aberto) {
      focoAnterior.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', aoTecla);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', aoTecla);
      document.body.style.overflow = '';
      if (focoAnterior.current) focoAnterior.current.focus();
    };
  }, [aberto, aoFechar]);

  useEffect(() => {
    if (aberto && contentRef.current) {
      const focavel = contentRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focavel?.focus();
    }
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      ref={overlayRef}
      className="modal__overlay"
      onClick={aoCliqueOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
      aria-describedby={descricao ? 'modal-descricao' : undefined}
    >
      <div ref={contentRef} className="modal__content" role="document">
        <header className="modal__header">
          <h2 id="modal-titulo" className="modal__titulo">
            {titulo}
          </h2>
          <button
            className="modal__close"
            onClick={aoFechar}
            aria-label="Fechar modal"
            type="button"
          >
            <Icon name="x" size={18} />
          </button>
        </header>

        {descricao && (
          <p id="modal-descricao" className="modal__descricao">
            {descricao}
          </p>
        )}

        {children && <div className="modal__body">{children}</div>}

        {(acaoPrimaria || acaoSecundaria) && (
          <footer className="modal__footer">
            {acaoSecundaria && (
              <button className="btn btn--fantasma" onClick={acaoSecundaria.onClick} type="button">
                {acaoSecundaria.label}
              </button>
            )}
            {acaoPrimaria && (
              <button
                className={`btn ${acaoPrimaria.variante === 'perigosa' ? 'btn--perigoso' : 'btn--primario'}`}
                onClick={acaoPrimaria.onClick}
                disabled={acaoPrimaria.carregando}
                type="button"
              >
                {acaoPrimaria.carregando ? (
                  <>
                    <span
                      className="spinner"
                      style={{ width: 14, height: 14 }}
                      aria-hidden="true"
                    />
                    {acaoPrimaria.label}
                  </>
                ) : (
                  acaoPrimaria.label
                )}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
