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

type CampoErro = { email?: string; senha?: string };

function validarLogin(email: string, senha: string): CampoErro {
  const e: CampoErro = {};
  if (!email.trim()) e.email = 'Informe seu e-mail.';
  if (!senha) e.senha = 'Informe sua senha.';
  return e;
}

export function LoginView() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [camposErro, setCamposErro] = useState<CampoErro>({});
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(false);
  const { demo, entrar } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  function aoBlur(campo: string) {
    setTocados((p) => ({ ...p, [campo]: true }));
    setCamposErro(validarLogin(email, senha));
  }

  function aoDigitarEmail(val: string) {
    setEmail(val);
    setErro(null);
    if (tocados.email) setCamposErro(validarLogin(val, senha));
  }

  function aoDigitarSenha(val: string) {
    setSenha(val);
    setErro(null);
    if (tocados.senha) setCamposErro(validarLogin(email, val));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setTocados({ email: true, senha: true });
    const erros = validarLogin(email, senha);
    setCamposErro(erros);
    if (erros.email || erros.senha) return;
    setCarregando(true);
    try {
      let usuario: UsuarioLogado;
      if (demo) {
        await new Promise((r) => setTimeout(r, 400));
        setToken('demo-token');
        usuario = {
          id: 2,
          username: 'carlos.menezes',
          email: 'carlos@empresa.com.br',
          role: 'admin',
        };
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
          Painel de controle do seu suporte. Chamados, responsáveis e status numa única bancada de
          operação.
        </p>
        <div className="login__readout">
          <div>
            <Lamp cor="var(--lamp-resolvido)" acesa /> 24h de registro
          </div>
          <div>
            <Lamp cor="var(--lamp-andamento)" acesa /> fila ao vivo
          </div>
        </div>
      </section>

      <section className="login__panel">
        <form className="login__card" onSubmit={onSubmit} noValidate>
          <h1 className="login__card-title">Acesso ao painel</h1>
          <p className="login__card-sub u-mono">Credenciamento de operador</p>

          <div className="field">
            <label className="field__label" htmlFor="email">
              E-mail <span>*</span>
            </label>
            <input
              id="email"
              className={
                'field__input' + (tocados.email && camposErro.email ? ' field__input--erro' : '')
              }
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => aoDigitarEmail(e.target.value)}
              onBlur={() => aoBlur('email')}
              placeholder="voce@empresa.com.br"
              aria-invalid={!!(tocados.email && camposErro.email)}
              aria-describedby={tocados.email && camposErro.email ? 'email-erro' : undefined}
              required
            />
            {tocados.email && camposErro.email && (
              <p className="field__error field__error--inline" id="email-erro" role="alert">
                <Icon name="alert" size={13} /> {camposErro.email}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="senha">
              Senha <span>*</span>
            </label>
            <input
              id="senha"
              className={
                'field__input' + (tocados.senha && camposErro.senha ? ' field__input--erro' : '')
              }
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => aoDigitarSenha(e.target.value)}
              onBlur={() => aoBlur('senha')}
              placeholder="••••••••"
              aria-invalid={!!(tocados.senha && camposErro.senha)}
              aria-describedby={tocados.senha && camposErro.senha ? 'senha-erro' : undefined}
              required
            />
            {tocados.senha && camposErro.senha && (
              <p className="field__error field__error--inline" id="senha-erro" role="alert">
                <Icon name="alert" size={13} /> {camposErro.senha}
              </p>
            )}
          </div>

          {erro && (
            <p className="field__error field__error--form" role="alert">
              <Icon name="alert" size={14} /> {erro}
            </p>
          )}

          <button className="btn btn--primario btn--block" type="submit" disabled={carregando}>
            {carregando ? <Spinner size={15} /> : <Icon name="send" size={15} />}
            {carregando ? 'Autenticando…' : 'Entrar no painel'}
          </button>

          {demo && (
            <p className="login__demo-hint">
              <strong>Modo demonstração.</strong> O backend não está ativo; esta sessão usa dados
              sintéticos rotulados como <em>Demo</em>. Qualquer e-mail/senha entra no painel.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
