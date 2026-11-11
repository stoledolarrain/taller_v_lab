import React, { useState } from 'react';
import type { Round } from '../../types/rounds';
import { StatusBadge } from '../ui/StatusBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';

interface RoundHistoryProps {
  history: Round[];
  isLoading: boolean;
}

/**
 * RoundHistory — tabla o lista colapsable del historial de rondas completadas.
 * Muestra a quién se entregó el fondo y montos recaudados [PDF Sec. 8].
 * data-testid="round-history-section" para pruebas E2E 06.
 */
export const RoundHistory: React.FC<RoundHistoryProps> = ({
  history = [],
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filtrar solo las rondas cerradas/completadas para el historial
  const closedRounds = history.filter((r) => r.status === 'CERRADA');

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
          <span>📜 Historial de Rondas Finalizadas</span>
          <span className="round-history-count-badge">
            {closedRounds.length} completada{closedRounds.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="toggle-chevron" aria-hidden="true">
          {isExpanded ? '▲ Ocultar' : '▼ Ver historial'}
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
                  </tr>
                </thead>
                <tbody>
                  {closedRounds.map((r) => {
                    const beneficiaryName =
                      r.beneficiary.full_name ||
                      [r.beneficiary.first_name, r.beneficiary.last_name]
                        .filter(Boolean)
                        .join(' ') ||
                      r.beneficiary.username;

                    return (
                      <tr key={r.id} data-testid={`history-round-row-${r.round_number}`}>
                        <td className="round-history-num">
                          <strong>#{r.round_number}</strong>
                        </td>
                        <td className="round-history-beneficiary">
                          <span className="beneficiary-avatar">🎁</span>{' '}
                          <strong>{beneficiaryName}</strong>{' '}
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
                          {r.closed_at
                            ? new Date(r.closed_at).toLocaleDateString('es-BO', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
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
