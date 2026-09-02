import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, setToken } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Icon } from '../components/Icon';
import { Lamp } from '../components/Lamp';
import { Spinner } from '../components/Loading';
import { useToast } from '../components/Toast';
import type { UsuarioLogado } from '../lib/types';

export function LoginView() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const { demo, entrar } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      let usuario: UsuarioLogado;
      if (demo) {
        // Modo demo: fake login sempre aceito, selo DEMO já visível.
        await new Promise((r) => setTimeout(r, 400));
        setToken('demo-token');
        usuario = { id: 2, username: 'carlos.menezes', email: 'carlos@empresa.com.br', role: 'admin' };
        entrar(usuario);
      } else {
        const r = await api.login(email, senha);
        setToken(r.token);
        entrar(r.user);
        usuario = r.user;
      }
      toast.sucesso(`Bem-vindo, ${usuario.username}.`);
      navigate('/chamados', { replace: true });
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Falha ao entrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login">
      <section className="login__face" aria-label="Painel de controle">
        <div className="login__mark">SupDesk</div>
        <p className="login__tagline">
          Painel de controle do seu suporte. Chamados, responsáveis e status
          numa única bancada de operação.
        </p>
        <div className="login__readout">
          <div><Lamp cor="var(--lamp-resolvido)" acesa /> 24h de registro</div>
          <div><Lamp cor="var(--lamp-andamento)" acesa /> fila ao vivo</div>
        </div>
      </section>

      <section className="login__panel">
        <form className="login__card" onSubmit={onSubmit} noValidate>
          <h1 className="login__card-title">Acesso ao painel</h1>
          <p className="login__card-sub u-mono">Credenciamento de operador</p>

          <div className="field">
            <label className="field__label" htmlFor="email">E-mail</label>
            <input
              id="email"
              className="field__input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com.br"
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="senha">Senha</label>
            <input
              id="senha"
              className="field__input"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {erro && (
            <p className="field__error" role="alert">
              <Icon name="alert" size={14} /> {erro}
            </p>
          )}

          <button className="btn btn--primario btn--block" type="submit" disabled={carregando}>
            {carregando ? <Spinner size={15} /> : <Icon name="send" size={15} />}
            {carregando ? 'Autenticando…' : 'Entrar no painel'}
          </button>

          {demo && (
            <p className="login__demo-hint">
              <strong>Modo demonstração.</strong> O backend não está ativo; esta
              sessão usa dados sintéticos rotulados como <em>Demo</em>. Qualquer
              e-mail/senha entra no painel.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}