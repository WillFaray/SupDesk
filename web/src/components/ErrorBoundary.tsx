import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from './Icon';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Quando o valor muda, o erro capturado é limpo e os filhos são
   * re-renderizados. Útil para resetar na navegação (location.key) ou a
   * partir de uma tentativa externa.
   */
  resetKey?: unknown;
  /** Substitui a UI de erro padrão. Recebe o erro e a função de reset. */
  renderFallback?: (detalhes: { error: Error; reset: () => void }) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Error Boundary — captura falhas de renderização do subtree e mostra uma
 * tela de recuperação em vez de desmontar a árvore inteira.
 * Não captura erros em event handlers, promises ou código assíncrono.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Diagnóstico no console; o usuário vê o fallback estilizado.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { children, renderFallback } = this.props;
    const { error } = this.state;

    if (error) {
      if (renderFallback) {
        return renderFallback({ error, reset: this.reset });
      }
      return <ErrorFallback error={error} reset={this.reset} />;
    }

    return children;
  }
}

function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const mensagem = error.message || error.name || 'Erro desconhecido';
  return (
    <div className="ebound" role="alert">
      <div className="ebound__card">
        <span className="ebound__ic" aria-hidden="true">
          <Icon name="alert" size={20} />
        </span>
        <h2 className="ebound__title">Algo deu errado</h2>
        <p className="ebound__msg">
          Ocorreu um erro inesperado ao renderizar esta tela. Tente novamente — seus dados estão
          seguros.
        </p>
        <code className="ebound__code u-mono">{mensagem}</code>
        <div className="ebound__actions">
          <button className="btn" onClick={reset}>
            <Icon name="refresh" size={15} /> Tentar de novo
          </button>
          <button className="btn btn--primario" onClick={() => window.location.reload()}>
            <Icon name="send" size={15} /> Recarregar aplicação
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Boundary por rota: reinicia automaticamente quando o usuário navega,
 * então um erro numa tela não contamina as demais.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.key}>{children}</ErrorBoundary>;
}
