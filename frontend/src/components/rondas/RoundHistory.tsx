import React, { Fragment, useState } from 'react';
import type { Round } from '../../types/rounds';
import type { Contribution } from '../../types/contributions';
import { formatearFecha } from '../../types/contributions';
import { StatusBadge } from '../ui/StatusBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';

interface RoundHistoryProps {
  history: Round[];
  isLoading: boolean;
  /** Cuotas ya consultadas por ronda (id de ronda → cuotas) */
  roundContributions?: Record<number, Contribution[]>;
  loadingRoundId?: number | null;
  onLoadRoundContributions?: (roundId: number) => Promise<void>;
}

const nombreUsuario = (u: Round['beneficiary']): string =>
  u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;

const COLUMNAS = 6;

/**
 * RoundHistory — tabla colapsable del historial de rondas completadas.
 * Muestra a quién se entregó el fondo, montos recaudados y, al desplegar una ronda,
 * el estado de la cuota de cada participante con fechas de pago y validación [PDF Sec. 8].
 * data-testid="round-history-section" para pruebas E2E 06.
 */
export const RoundHistory: React.FC<RoundHistoryProps> = ({
  history = [],
  isLoading,
  roundContributions = {},
  loadingRoundId = null,
  onLoadRoundContributions,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openRoundId, setOpenRoundId] = useState<number | null>(null);

  // Filtrar solo las rondas cerradas para el historial
  const closedRounds = history.filter((r) => r.status === 'CERRADA');

  const toggleRound = (roundId: number) => {
    if (openRoundId === roundId) {
      setOpenRoundId(null);
      return;
    }
    setOpenRoundId(roundId);
    if (!roundContributions[roundId]) {
      onLoadRoundContributions?.(roundId);
    }
  };

  return (
    <section
      className="round-history-section"
      aria-label="Historial de rondas finalizadas"
      data-testid="round-history-section"
    >
      <button
        type="button"
        className="round-history-toggle"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        data-testid="round-history-toggle-btn"
      >
        <div className="round-history-toggle__title">
          <span>Historial de Rondas Finalizadas</span>
          <span className="round-history-count-badge">
            {closedRounds.length} completada{closedRounds.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="toggle-chevron" aria-hidden="true">
          {isExpanded ? 'Ocultar' : 'Ver historial'}
        </span>
      </button>

      {isExpanded && (
        <div className="round-history-content" data-testid="round-history-content">
          {isLoading ? (
            <p className="round-history-empty">Cargando historial de rondas...</p>
          ) : closedRounds.length === 0 ? (
            <p className="round-history-empty">
              Aún no hay rondas cerradas en este pasanaku.
            </p>
          ) : (
            <div className="round-history-table-wrapper">
              <table className="round-history-table">
                <thead>
                  <tr>
                    <th scope="col">Ronda</th>
                    <th scope="col">Beneficiario (Fondo Entregado)</th>
                    <th scope="col">Monto Recaudado</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Fecha de Cierre</th>
                    {onLoadRoundContributions && <th scope="col">Cuotas</th>}
                  </tr>
                </thead>
                <tbody>
                  {closedRounds.map((r) => {
                    const isOpen = openRoundId === r.id;
                    const cuotas = roundContributions[r.id];
                    const isLoadingRound = loadingRoundId === r.id;

                    return (
                      <Fragment key={r.id}>
                        <tr data-testid={`history-round-row-${r.round_number}`}>
                          <td className="round-history-num">
                            <strong>#{r.round_number}</strong>
                          </td>
                          <td className="round-history-beneficiary">
                            <strong>{nombreUsuario(r.beneficiary)}</strong>{' '}
                            <span className="beneficiary-handle">
                              @{r.beneficiary.username}
                            </span>
                          </td>
                          <td className="round-history-amount">
                            <CurrencyDisplay amount={r.expected_amount} />
                          </td>
                          <td>
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="round-history-date">
                            {formatearFecha(r.closed_at) ?? '—'}
                          </td>
                          {onLoadRoundContributions && (
                            <td>
                              <button
                                type="button"
                                className="link-btn round-history-detail-btn"
                                onClick={() => toggleRound(r.id)}
                                aria-expanded={isOpen}
                                aria-controls={`round-detail-${r.id}`}
                                data-testid={`history-round-detail-btn-${r.round_number}`}
                              >
                                {isOpen ? 'Ocultar' : 'Ver cuotas'}
                              </button>
                            </td>
                          )}
                        </tr>

                        {isOpen && (
                          <tr
                            id={`round-detail-${r.id}`}
                            className="round-history-detail-row"
                            data-testid={`history-round-detail-${r.round_number}`}
                          >
                            <td colSpan={COLUMNAS}>
                              {isLoadingRound || !cuotas ? (
                                <p className="round-history-empty">
                                  Cargando cuotas de la ronda...
                                </p>
                              ) : cuotas.length === 0 ? (
                                <p className="round-history-empty">
                                  Esta ronda no tiene cuotas registradas.
                                </p>
                              ) : (
                                <ul className="round-detail-list" role="list">
                                  {cuotas.map((c) => (
                                    <li key={c.id} className="round-detail-item">
                                      <span className="round-detail-user">
                                        <strong>{nombreUsuario(c.user)}</strong>{' '}
                                        <span className="beneficiary-handle">
                                          @{c.user.username}
                                        </span>
                                      </span>
                                      <span className="round-detail-amount">
                                        <CurrencyDisplay amount={c.amount} />
                                      </span>
                                      <StatusBadge status={c.status} />
                                      <span className="round-detail-dates">
                                        Pago: {formatearFecha(c.payment_date) ?? '—'}
                                        <span aria-hidden="true"> · </span>
                                        Validación:{' '}
                                        {formatearFecha(c.validation_date) ?? '—'}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
