/* ==========================================================================
   LOADING — spinner inline (botões) e painel de espera (telas)
   ========================================================================== */

export function Spinner({ size = 16, label = 'Carregando' }: { size?: number; label?: string }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    />
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="panel-empty loading" role="status">
      <Spinner size={26} label={label} />
      <p>
        <strong>{label}</strong>
      </p>
    </div>
  );
}
