import { Icon } from './Icon';
import { Lamp } from './Lamp';
import { formatarIntervalo, txHora, tempoDecorrido, type Chamado, type Status } from '../lib/types';

interface WorkflowStepperProps {
  chamado: Chamado;
  statusAtual: Status;
}

export function WorkflowStepper({ chamado, statusAtual }: WorkflowStepperProps) {
  const isEmAndamento = statusAtual === 'Em andamento';
  const isResolvido = statusAtual === 'Resolvido';

  // Etapa 2: Atendimento (em andamento ou concluída)
  const etapa2Ativa = isEmAndamento;
  const etapa2Completa = isResolvido || !!chamado.primeiro_atendimento_em;

  // Etapa 3: Resolução
  const etapa3Completa = isResolvido && !!chamado.resolvido_em;

  const tempoAtePrimeiro = formatarIntervalo(chamado.created_at, chamado.primeiro_atendimento_em);
  const tempoTotal = formatarIntervalo(chamado.created_at, chamado.resolvido_em);

  return (
    <section className="instrument workflow-stepper" aria-label="Etapas do atendimento">
      <div className="instrument__head">
        <span className="instrument__title">
          <Icon name="gauge" size={13} /> Fluxo de Resolução
        </span>
        <span className="workflow-stepper__badge">
          Etapa: <strong>{statusAtual}</strong>
        </span>
      </div>
      <div className="instrument__body">
        <ol className="stepper">
          {/* ETAPA 1: ABERTURA */}
          <li className={`stepper__item stepper__item--concluido`}>
            <div className="stepper__indicator" aria-hidden="true">
              <Icon name="check" size={13} />
            </div>
            <div className="stepper__content">
              <div className="stepper__title">
                <span>1. Abertura</span>
                <span className="stepper__tag">Registrado</span>
              </div>
              <p className="stepper__desc">
                Aberto por <strong>{chamado.autor_do_chamado}</strong>
              </p>
              <div className="stepper__meta">
                <Icon name="clock" size={11} /> {txHora(chamado.created_at)}
              </div>
            </div>
          </li>

          {/* LINHA CONECTORA 1 -> 2 */}
          <div
            className={`stepper__track ${etapa2Completa || etapa2Ativa ? 'stepper__track--ativo' : ''}`}
            aria-hidden="true"
          />

          {/* ETAPA 2: ATENDIMENTO */}
          <li
            className={`stepper__item ${
              etapa3Completa
                ? 'stepper__item--concluido'
                : etapa2Ativa
                  ? 'stepper__item--ativo'
                  : 'stepper__item--pendente'
            }`}
          >
            <div className="stepper__indicator" aria-hidden="true">
              {etapa3Completa ? (
                <Icon name="check" size={13} />
              ) : etapa2Ativa ? (
                <Lamp cor="var(--lamp-laranja)" acesa size={8} />
              ) : (
                <span>2</span>
              )}
            </div>
            <div className="stepper__content">
              <div className="stepper__title">
                <span>2. Atendimento</span>
                {etapa2Ativa && <span className="stepper__tag stepper__tag--ativo">Em curso</span>}
                {etapa3Completa && <span className="stepper__tag">Concluído</span>}
              </div>
              <p className="stepper__desc">
                {chamado.responsavel ? (
                  <>
                    Responsável: <strong>{chamado.responsavel}</strong>
                  </>
                ) : (
                  <span style={{ color: 'var(--ink-muted)' }}>Aguardando triagem</span>
                )}
              </p>
              <div className="stepper__meta">
                {chamado.primeiro_atendimento_em ? (
                  <>
                    <Icon name="bolt" size={11} /> Assumido em{' '}
                    {txHora(chamado.primeiro_atendimento_em)}
                    {tempoAtePrimeiro !== '—' && (
                      <span className="stepper__tempo">· Espera: {tempoAtePrimeiro}</span>
                    )}
                  </>
                ) : (
                  <>
                    <Icon name="clock" size={11} /> Em triagem há{' '}
                    {tempoDecorrido(chamado.created_at)}
                  </>
                )}
              </div>
            </div>
          </li>

          {/* LINHA CONECTORA 2 -> 3 */}
          <div
            className={`stepper__track ${etapa3Completa ? 'stepper__track--ativo' : ''}`}
            aria-hidden="true"
          />

          {/* ETAPA 3: RESOLUÇÃO */}
          <li
            className={`stepper__item ${
              etapa3Completa ? 'stepper__item--concluido' : 'stepper__item--pendente'
            }`}
          >
            <div className="stepper__indicator" aria-hidden="true">
              {etapa3Completa ? <Icon name="check" size={13} /> : <span>3</span>}
            </div>
            <div className="stepper__content">
              <div className="stepper__title">
                <span>3. Resolução</span>
                {etapa3Completa && (
                  <span className="stepper__tag stepper__tag--sucesso">Resolvido</span>
                )}
              </div>
              <p className="stepper__desc">
                {etapa3Completa ? (
                  <>
                    Resolvido por{' '}
                    <strong>{chamado.resolvido_por ?? chamado.responsavel ?? 'analista'}</strong>
                  </>
                ) : (
                  <span style={{ color: 'var(--ink-muted)' }}>Solução pendente</span>
                )}
              </p>
              <div className="stepper__meta">
                {etapa3Completa && chamado.resolvido_em ? (
                  <>
                    <Icon name="clock" size={11} /> Concluído em {txHora(chamado.resolvido_em)}
                    {tempoTotal !== '—' && (
                      <span className="stepper__tempo">· Atendimento total: {tempoTotal}</span>
                    )}
                  </>
                ) : isEmAndamento ? (
                  <>
                    <Icon name="clock" size={11} /> Em atendimento há{' '}
                    {tempoDecorrido(chamado.primeiro_atendimento_em ?? chamado.created_at)}
                  </>
                ) : (
                  'Aguardando início'
                )}
              </div>
            </div>
          </li>
        </ol>

        {chamado.resolucao && (
          <div
            className="workflow-stepper__solucao"
            role="region"
            aria-label="Justificativa da resolução"
          >
            <div className="workflow-stepper__solucao-head">
              <Icon name="check" size={14} />
              <strong>Justificativa da resolução registrada:</strong>
            </div>
            <p className="workflow-stepper__solucao-texto">{chamado.resolucao}</p>
          </div>
        )}
      </div>
    </section>
  );
}
